import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { createUid } from '../../domain/shared/uid';
import {
  InvalidMonthError,
  MonthAlreadyClosedError,
  MonthNotClosedError,
} from '../../domain/errors';
import type {
  FinanceEntry,
  MonthClosing,
  MonthKey,
} from '../../domain/finance/finance.entity';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import {
  compareMonths,
  currentMonthKey,
  isValidMonthKey,
  resolveBudget,
  summarizeMonth,
  type MonthSummary,
} from '../../domain/finance/finance.rules';

export interface ClosingPreview {
  month: MonthKey;
  summary: MonthSummary;
  pendingEntries: FinanceEntry[];
  alreadyClosed: boolean;
}

interface MonthSnapshot {
  summary: MonthSummary;
  monthEntries: FinanceEntry[];
}

async function buildMonthSnapshot(
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  month: MonthKey,
): Promise<Either<AppError, MonthSnapshot>> {
  const monthEntries = await entries.list({ month });
  if (isLeft(monthEntries)) return monthEntries;

  const items = await budget.listAll();
  if (isLeft(items)) return items;

  const categoryList = await categories.list();
  if (isLeft(categoryList)) return categoryList;

  const resolved = resolveBudget(items.right, month, categoryList.right);
  return right({
    summary: summarizeMonth(monthEntries.right, resolved, categoryList.right),
    monthEntries: monthEntries.right,
  });
}

export function makeLoadClosingPreview(
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (month: MonthKey): Promise<Either<AppError, ClosingPreview>> => {
    const closing = await closings.findByMonth(month);
    if (isLeft(closing)) return closing;

    const snapshot = await buildMonthSnapshot(
      entries,
      budget,
      categories,
      month,
    );
    if (isLeft(snapshot)) return snapshot;

    return right({
      month,
      summary: snapshot.right.summary,
      pendingEntries: snapshot.right.monthEntries.filter(
        (entry) => entry.status === 'pending',
      ),
      alreadyClosed: closing.right !== undefined,
    });
  };
}

export function makeCloseMonth(
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    month: MonthKey,
    nowMs: number,
  ): Promise<Either<AppError, MonthClosing>> => {
    if (
      !isValidMonthKey(month) ||
      compareMonths(month, currentMonthKey(nowMs)) > 0
    ) {
      return left(new InvalidMonthError(month));
    }

    const existing = await closings.findByMonth(month);
    if (isLeft(existing)) return existing;
    if (existing.right) return left(new MonthAlreadyClosedError(month));

    const snapshot = await buildMonthSnapshot(
      entries,
      budget,
      categories,
      month,
    );
    if (isLeft(snapshot)) return snapshot;

    const summary = snapshot.right.summary;
    return closings.create({
      uid: createUid(),
      month,
      closedAt: nowMs,
      plannedIncome: summary.plannedIncome,
      plannedExpense: summary.plannedExpense,
      plannedBalance: summary.plannedBalance,
      actualIncome: summary.actualIncome,
      actualExpense: summary.actualExpense,
      actualBalance: summary.actualBalance,
      categories: summary.categories.map((line) => ({ ...line })),
    });
  };
}

export function makeReopenMonth(closings: FinanceClosingRepository) {
  return async (month: MonthKey): Promise<Either<AppError, void>> => {
    const existing = await closings.findByMonth(month);
    if (isLeft(existing)) return existing;
    if (!existing.right) return left(new MonthNotClosedError(month));

    return closings.deleteByMonth(month);
  };
}

export function makeListClosings(closings: FinanceClosingRepository) {
  return (): Promise<Either<AppError, MonthClosing[]>> => closings.list();
}
