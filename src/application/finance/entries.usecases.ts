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

export interface EntryInput {
  description: string;
  amount: number;
  categoryUid: string;
  memberUids: string[];
  date: number;
  status: EntryStatus;
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

export function makeListEntries(entries: FinanceEntryRepository) {
  return async (
    filter: FinanceEntryFilter,
  ): Promise<Either<AppError, FinanceEntry[]>> => entries.list(filter);
}

export function makeListOverdueEntries(
  entries: FinanceEntryRepository,
  closings: FinanceClosingRepository,
) {
  return async (nowMs: number): Promise<Either<AppError, FinanceEntry[]>> => {
    const closedMonths = await closings.listClosedMonths();
    if (isLeft(closedMonths)) return closedMonths;

    return entries.list({
      status: 'pending',
      monthBefore: currentMonthKey(nowMs),
    });
  };
}

export function makeCreateEntry(
  entries: FinanceEntryRepository,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (input: EntryInput): Promise<Either<AppError, FinanceEntry>> => {
    const amount = validateInput(input);
    if (isLeft(amount)) return amount;

    const allCategories = await categories.list();
    if (isLeft(allCategories)) return allCategories;

    const category = allCategories.right.find(
      (candidate) => candidate.uid === input.categoryUid,
    );
    if (!category) return left(new FinanceCategoryNotFoundError());

    const month = monthKeyFromDate(input.date);
    const open = await ensureMonthOpen(closings, month);
    if (isLeft(open)) return open;

    const now = Date.now();
    return entries.create({
      uid: createUid(),
      description: input.description.trim(),
      amount: amount.right,
      kind: category.kind,
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
      createdAt: now,
      updatedAt: now,
    });
  };
}

export function makeUpdateEntry(
  entries: FinanceEntryRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    uid: string,
    input: EntryInput,
  ): Promise<Either<AppError, FinanceEntry>> => {
    const existing = await entries.findByUid(uid);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new FinanceEntryNotFoundError());

    if (
      existing.right.source !== 'manual' &&
      input.date !== existing.right.date
    ) {
      return left(new DerivedEntryDateLockedError());
    }

    const amount = validateInput(input);
    if (isLeft(amount)) return amount;

    const storedOpen = await ensureMonthOpen(closings, existing.right.month);
    if (isLeft(storedOpen)) return storedOpen;

    const month = monthKeyFromDate(input.date);
    const targetOpen = await ensureMonthOpen(closings, month);
    if (isLeft(targetOpen)) return targetOpen;

    return entries.update(uid, {
      description: input.description.trim(),
      amount: amount.right,
      categoryUid: input.categoryUid,
      memberUids: [...input.memberUids],
      date: input.date,
      month,
      status: input.status,
      updatedAt: Date.now(),
    });
  };
}

export function makeDeleteEntry(
  entries: FinanceEntryRepository,
  closings: FinanceClosingRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> => {
    const existing = await entries.findByUid(uid);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new FinanceEntryNotFoundError());

    const open = await ensureMonthOpen(closings, existing.right.month);
    if (isLeft(open)) return open;

    return entries.delete(uid);
  };
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
