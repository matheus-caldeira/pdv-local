import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import {
  DerivedEntryDateLockedError,
  EmptyMemberSelectionError,
  FinanceCategoryNotFoundError,
  FinanceEntryNotFoundError,
  MonthClosedError,
} from '../../domain/errors';
import type {
  EntryStatus,
  FinanceCategory,
  FinanceEntry,
  MonthKey,
} from '../../domain/finance/finance.entity';
import {
  currentMonthKey,
  monthKeyFromDate,
  normalizeAmount,
} from '../../domain/finance/finance.rules';
import type {
  FinanceEntryFilter,
  FinanceEntryRepository,
} from '../../domain/finance/finance-entry.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import {
  reconcileInvoiceAdjustment,
  resolveEntryInvoice,
} from './invoices.usecases';

export interface EntryInput {
  description: string;
  amount: number;
  categoryUid: string;
  memberUids: string[];
  date: number;
  status: EntryStatus;
  paymentMethodUid: string | null;
}

const validateInput = (input: EntryInput): Either<AppError, number> => {
  const amount = normalizeAmount(input.amount);
  if (isLeft(amount)) return amount;
  if (input.memberUids.length === 0) {
    return left(new EmptyMemberSelectionError());
  }
  return amount;
};

const ensureMonthOpen = async (
  closings: FinanceClosingRepository,
  month: MonthKey,
): Promise<Either<AppError, void>> => {
  const closing = await closings.findByMonth(month);
  if (isLeft(closing)) return closing;
  if (closing.right) return left(new MonthClosedError(month));
  return right(undefined);
};

const findCategory = async (
  categories: FinanceCategoryRepository,
  categoryUid: string,
): Promise<Either<AppError, FinanceCategory>> => {
  const allCategories = await categories.list();
  if (isLeft(allCategories)) return allCategories;
  const category = allCategories.right.find(
    (candidate) => candidate.uid === categoryUid,
  );
  if (!category) return left(new FinanceCategoryNotFoundError());
  return right(category);
};

type ReconcileRepositories = Parameters<typeof reconcileInvoiceAdjustment>[0];

const reconcileAffectedInvoices = async (
  repositories: ReconcileRepositories,
  categories: FinanceCategoryRepository,
  affected: {
    paymentMethodUid: string | null;
    invoiceMonth: MonthKey | null;
  }[],
): Promise<Either<AppError, void>> => {
  const seen = new Set<string>();
  for (const target of affected) {
    if (target.paymentMethodUid === null || target.invoiceMonth === null) {
      continue;
    }
    const key = `${target.paymentMethodUid}:${target.invoiceMonth}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const reconciled = await reconcileInvoiceAdjustment(
      repositories,
      categories,
      target.paymentMethodUid,
      target.invoiceMonth,
    );
    if (isLeft(reconciled)) return reconciled;
  }
  return right(undefined);
};

export function makeListEntries(entries: FinanceEntryRepository) {
  return async (
    filter: FinanceEntryFilter,
  ): Promise<Either<AppError, FinanceEntry[]>> => entries.list(filter);
}

export function makeListOverdueEntries(entries: FinanceEntryRepository) {
  return async (nowMs: number): Promise<Either<AppError, FinanceEntry[]>> =>
    entries.list({
      status: 'pending',
      monthBefore: currentMonthKey(nowMs),
    });
}

export function makeCreateEntry(
  uow: UnitOfWork,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (input: EntryInput): Promise<Either<AppError, FinanceEntry>> => {
    const amount = validateInput(input);
    if (isLeft(amount)) return amount;

    const category = await findCategory(categories, input.categoryUid);
    if (isLeft(category)) return category;

    const month = monthKeyFromDate(input.date);
    const open = await ensureMonthOpen(closings, month);
    if (isLeft(open)) return open;

    return uow.run(async (repositories) => {
      const link = await resolveEntryInvoice(
        repositories.financePaymentMethods,
        repositories.financeCardInvoices,
        input.paymentMethodUid,
        input.date,
      );
      if (isLeft(link)) return link;

      const now = Date.now();
      const created = await repositories.financeEntries.create({
        uid: createUid(),
        description: input.description.trim(),
        amount: amount.right,
        kind: category.right.kind,
        categoryUid: input.categoryUid,
        memberUids: [...input.memberUids],
        date: input.date,
        month,
        status: input.status,
        source: 'manual',
        sourceUid: null,
        installmentNumber: null,
        sourceEntryUids: [],
        formulaBaseMonth: null,
        paymentMethodUid: input.paymentMethodUid,
        invoiceMonth: link.right.invoiceMonth,
        invoiceUid: link.right.invoiceUid,
        createdAt: now,
        updatedAt: now,
      });
      if (isLeft(created)) return created;

      const reconciled = await reconcileAffectedInvoices(
        repositories,
        categories,
        [
          {
            paymentMethodUid: input.paymentMethodUid,
            invoiceMonth: link.right.invoiceMonth,
          },
        ],
      );
      if (isLeft(reconciled)) return reconciled;

      return created;
    });
  };
}

export function makeUpdateEntry(
  uow: UnitOfWork,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    uid: string,
    input: EntryInput,
  ): Promise<Either<AppError, FinanceEntry>> => {
    const amount = validateInput(input);
    if (isLeft(amount)) return amount;

    const category = await findCategory(categories, input.categoryUid);
    if (isLeft(category)) return category;

    return uow.run(async (repositories) => {
      const existing = await repositories.financeEntries.findByUid(uid);
      if (isLeft(existing)) return existing;
      if (!existing.right) return left(new FinanceEntryNotFoundError());
      const previous = existing.right;

      if (previous.source !== 'manual' && input.date !== previous.date) {
        return left(new DerivedEntryDateLockedError());
      }

      const storedOpen = await ensureMonthOpen(closings, previous.month);
      if (isLeft(storedOpen)) return storedOpen;

      const month = monthKeyFromDate(input.date);
      const targetOpen = await ensureMonthOpen(closings, month);
      if (isLeft(targetOpen)) return targetOpen;

      const link = await resolveEntryInvoice(
        repositories.financePaymentMethods,
        repositories.financeCardInvoices,
        input.paymentMethodUid,
        input.date,
      );
      if (isLeft(link)) return link;

      const updated = await repositories.financeEntries.update(uid, {
        description: input.description.trim(),
        amount: amount.right,
        kind: category.right.kind,
        categoryUid: input.categoryUid,
        memberUids: [...input.memberUids],
        date: input.date,
        month,
        status: input.status,
        paymentMethodUid: input.paymentMethodUid,
        invoiceMonth: link.right.invoiceMonth,
        invoiceUid: link.right.invoiceUid,
        updatedAt: Date.now(),
      });
      if (isLeft(updated)) return updated;

      const reconciled = await reconcileAffectedInvoices(
        repositories,
        categories,
        [
          {
            paymentMethodUid: previous.paymentMethodUid,
            invoiceMonth: previous.invoiceMonth,
          },
          {
            paymentMethodUid: input.paymentMethodUid,
            invoiceMonth: link.right.invoiceMonth,
          },
        ],
      );
      if (isLeft(reconciled)) return reconciled;

      return updated;
    });
  };
}

export function makeDeleteEntry(
  uow: UnitOfWork,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> =>
    uow.run(async (repositories) => {
      const existing = await repositories.financeEntries.findByUid(uid);
      if (isLeft(existing)) return existing;
      if (!existing.right) return left(new FinanceEntryNotFoundError());
      const previous = existing.right;

      const open = await ensureMonthOpen(closings, previous.month);
      if (isLeft(open)) return open;

      const deleted = await repositories.financeEntries.delete(uid);
      if (isLeft(deleted)) return deleted;

      return reconcileAffectedInvoices(repositories, categories, [
        {
          paymentMethodUid: previous.paymentMethodUid,
          invoiceMonth: previous.invoiceMonth,
        },
      ]);
    });
}

export function makeSetEntryStatus(entries: FinanceEntryRepository) {
  return async (
    uid: string,
    status: EntryStatus,
  ): Promise<Either<AppError, FinanceEntry>> => {
    const existing = await entries.findByUid(uid);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new FinanceEntryNotFoundError());

    return entries.update(uid, { status, updatedAt: Date.now() });
  };
}
