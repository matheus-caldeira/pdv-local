import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import {
  InvoiceNotFoundError,
  InvoiceOverdetailedError,
  InvoicePaidError,
  PaymentMethodNotFoundError,
} from '../../domain/errors';
import type {
  FinanceEntry,
  MonthKey,
  NewFinanceEntry,
} from '../../domain/finance/finance.entity';
import type { CardInvoice } from '../../domain/finance/payment-method.entity';
import type { PaymentMethodRepository } from '../../domain/finance/payment-method.repository';
import type { CardInvoiceRepository } from '../../domain/finance/card-invoice.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import {
  reconcileInvoice,
  resolveInvoiceMonth,
  type ReconcileResult,
} from '../../domain/finance/invoice.rules';
import {
  dateForMonthDay,
  normalizeAmount,
  round2,
} from '../../domain/finance/finance.rules';

export interface InvoiceDetail {
  invoice: CardInvoice | null;
  entries: FinanceEntry[];
  detailedTotal: number;
  reconciliation: ReconcileResult;
}

export interface InvoiceHistoryPoint {
  month: MonthKey;
  amount: number;
  delta: number | null;
}

export const INVOICE_ADJUSTMENT_DESCRIPTION = 'Outros gastos da fatura';

export const INVOICE_ADJUSTMENT_CATEGORY_NAME = 'Fatura de cartão';

async function resolveAdjustmentCategory(
  categories: FinanceCategoryRepository,
): Promise<Either<AppError, string>> {
  const listed = await categories.list();
  if (isLeft(listed)) return listed;

  const existing = listed.right.find(
    (category) => category.name === INVOICE_ADJUSTMENT_CATEGORY_NAME,
  );
  if (existing) return right(existing.uid);

  const created = await categories.create({
    name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
    kind: 'expense',
  });
  if (isLeft(created)) return created;
  return right(created.right.uid);
}

function isAdjustment(entry: FinanceEntry): boolean {
  return entry.source === 'invoice-adjustment';
}

function detailedTotalOf(entries: FinanceEntry[]): number {
  return round2(
    entries
      .filter((entry) => !isAdjustment(entry))
      .reduce(
        (sum, entry) =>
          entry.kind === 'expense' ? sum + entry.amount : sum - entry.amount,
        0,
      ),
  );
}

async function invoiceEntries(
  entries: FinanceEntryRepository,
  paymentMethodUid: string,
  month: MonthKey,
): Promise<Either<AppError, FinanceEntry[]>> {
  return entries.list({ paymentMethodUid, invoiceMonth: month });
}

export interface EntryInvoiceLink {
  invoiceMonth: MonthKey | null;
  invoiceUid: string | null;
}

export async function resolveEntryInvoice(
  methods: PaymentMethodRepository,
  invoices: CardInvoiceRepository,
  paymentMethodUid: string | null,
  date: number,
): Promise<Either<AppError, EntryInvoiceLink>> {
  if (paymentMethodUid === null) {
    return right({ invoiceMonth: null, invoiceUid: null });
  }
  const method = await methods.findByUid(paymentMethodUid);
  if (isLeft(method)) return method;
  if (!method.right) return left(new PaymentMethodNotFoundError());
  if (
    method.right.type !== 'credit' ||
    method.right.closingDay === null ||
    method.right.dueDay === null
  ) {
    return right({ invoiceMonth: null, invoiceUid: null });
  }
  const resolved = resolveInvoiceMonth(
    date,
    method.right.closingDay,
    method.right.dueDay,
  );
  const existing = await invoices.findByCardAndMonth(
    paymentMethodUid,
    resolved.month,
  );
  if (isLeft(existing)) return existing;
  return right({
    invoiceMonth: resolved.month,
    invoiceUid: existing.right?.uid ?? null,
  });
}

export function makeGetInvoiceDetail(
  invoices: CardInvoiceRepository,
  entries: FinanceEntryRepository,
) {
  return async (
    cardUid: string,
    month: MonthKey,
  ): Promise<Either<AppError, InvoiceDetail>> => {
    const invoice = await invoices.findByCardAndMonth(cardUid, month);
    if (isLeft(invoice)) return invoice;

    const invoiceEntriesResult = await invoiceEntries(entries, cardUid, month);
    if (isLeft(invoiceEntriesResult)) return invoiceEntriesResult;

    const detailedTotal = detailedTotalOf(invoiceEntriesResult.right);
    return right({
      invoice: invoice.right ?? null,
      entries: invoiceEntriesResult.right,
      detailedTotal,
      reconciliation: reconcileInvoice(
        invoice.right?.statedAmount ?? null,
        detailedTotal,
      ),
    });
  };
}

async function ensureInvoice(
  invoices: CardInvoiceRepository,
  existing: CardInvoice | undefined,
  cardUid: string,
  month: MonthKey,
  dueDay: number,
  statedAmount: number,
): Promise<Either<AppError, CardInvoice>> {
  const now = Date.now();
  if (existing) {
    return invoices.update(existing.uid, {
      statedAmount,
      updatedAt: now,
    });
  }

  return invoices.create({
    uid: createUid(),
    paymentMethodUid: cardUid,
    month,
    dueDate: dateForMonthDay(month, dueDay),
    statedAmount,
    status: 'open',
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

async function applyAdjustment(
  entries: FinanceEntryRepository,
  categories: FinanceCategoryRepository,
  invoice: CardInvoice,
  existingAdjustment: FinanceEntry | undefined,
  reconciliation: ReconcileResult,
): Promise<Either<AppError, void>> {
  if (reconciliation.kind === 'balanced') {
    if (existingAdjustment) {
      const deleted = await entries.delete(existingAdjustment.uid);
      if (isLeft(deleted)) return deleted;
    }
    return right(undefined);
  }

  const now = Date.now();
  if (existingAdjustment) {
    const updated = await entries.update(existingAdjustment.uid, {
      amount: reconciliation.amount,
      updatedAt: now,
    });
    if (isLeft(updated)) return updated;
    return right(undefined);
  }

  const categoryUid = await resolveAdjustmentCategory(categories);
  if (isLeft(categoryUid)) return categoryUid;

  const adjustment: NewFinanceEntry = {
    uid: createUid(),
    description: INVOICE_ADJUSTMENT_DESCRIPTION,
    amount: reconciliation.amount,
    kind: 'expense',
    categoryUid: categoryUid.right,
    memberUids: [],
    date: invoice.dueDate,
    month: invoice.month,
    status: 'pending',
    source: 'invoice-adjustment',
    sourceUid: invoice.uid,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: invoice.paymentMethodUid,
    invoiceMonth: invoice.month,
    invoiceUid: invoice.uid,
    createdAt: now,
    updatedAt: now,
  };
  const created = await entries.create(adjustment);
  if (isLeft(created)) return created;
  return right(undefined);
}

export function makeSetInvoiceAmount(
  uow: UnitOfWork,
  methods: PaymentMethodRepository,
  categories: FinanceCategoryRepository,
) {
  return async (
    cardUid: string,
    month: MonthKey,
    amount: number,
  ): Promise<Either<AppError, CardInvoice>> => {
    const statedAmount = normalizeAmount(amount);
    if (isLeft(statedAmount)) return statedAmount;

    const method = await methods.findByUid(cardUid);
    if (isLeft(method)) return method;
    if (!method.right) return left(new PaymentMethodNotFoundError());

    return uow.run(async (repositories) => {
      const existing =
        await repositories.financeCardInvoices.findByCardAndMonth(
          cardUid,
          month,
        );
      if (isLeft(existing)) return existing;
      if (existing.right && existing.right.status === 'paid') {
        return left(new InvoicePaidError());
      }

      const entriesResult = await invoiceEntries(
        repositories.financeEntries,
        cardUid,
        month,
      );
      if (isLeft(entriesResult)) return entriesResult;

      const detailedTotal = detailedTotalOf(entriesResult.right);
      const reconciliation = reconcileInvoice(
        statedAmount.right,
        detailedTotal,
      );
      if (reconciliation.kind === 'over') {
        return left(new InvoiceOverdetailedError(reconciliation.excess));
      }

      const invoice = await ensureInvoice(
        repositories.financeCardInvoices,
        existing.right,
        cardUid,
        month,
        method.right.dueDay ?? 1,
        statedAmount.right,
      );
      if (isLeft(invoice)) return invoice;

      const existingAdjustment = entriesResult.right.find(isAdjustment);
      const applied = await applyAdjustment(
        repositories.financeEntries,
        categories,
        invoice.right,
        existingAdjustment,
        reconciliation,
      );
      if (isLeft(applied)) return applied;

      return right(invoice.right);
    });
  };
}

export function makePayInvoice(invoices: CardInvoiceRepository) {
  return async (
    cardUid: string,
    month: MonthKey,
    paidAt: number,
  ): Promise<Either<AppError, CardInvoice>> => {
    const existing = await invoices.findByCardAndMonth(cardUid, month);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new InvoiceNotFoundError());

    return invoices.update(existing.right.uid, {
      status: 'paid',
      paidAt,
      updatedAt: Date.now(),
    });
  };
}

export function makeListInvoiceHistory(invoices: CardInvoiceRepository) {
  return async (
    cardUid: string,
    months: number,
  ): Promise<Either<AppError, InvoiceHistoryPoint[]>> => {
    const listed = await invoices.listByCard(cardUid);
    if (isLeft(listed)) return listed;

    const ordered = [...listed.right]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-months);

    return right(
      ordered.map((invoice, index) => {
        const amount = invoice.statedAmount ?? 0;
        const previous = ordered[index - 1];
        return {
          month: invoice.month,
          amount,
          delta:
            previous === undefined
              ? null
              : round2(amount - (previous.statedAmount ?? 0)),
        };
      }),
    );
  };
}
