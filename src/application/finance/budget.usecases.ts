import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import {
  BudgetItemNotFoundError,
  InvalidFinanceAmountError,
  MonthClosedError,
} from '../../domain/errors';
import type { BudgetItem, MonthKey } from '../../domain/finance/finance.entity';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import {
  resolveBudget,
  round2,
  type ResolvedBudgetLine,
} from '../../domain/finance/finance.rules';

export interface BudgetLineView extends ResolvedBudgetLine {
  templateAmount: number | null;
  overrideAmount: number | null;
  actual: number;
}

function normalizeBudgetAmount(
  amount: number,
): Either<InvalidFinanceAmountError, number> {
  if (!Number.isFinite(amount)) return left(new InvalidFinanceAmountError());
  const rounded = round2(amount);
  if (rounded < 0) return left(new InvalidFinanceAmountError());
  return right(rounded);
}

function amountsByCategory(
  lines: ResolvedBudgetLine[],
  items: BudgetItem[],
): Map<string, number> {
  const present = new Set(items.map((item) => item.categoryUid));
  return new Map(
    lines
      .filter((line) => present.has(line.categoryUid))
      .map((line) => [line.categoryUid, line.amount]),
  );
}

export function makeLoadBudget(
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  entries: FinanceEntryRepository,
) {
  return async (
    month: MonthKey,
  ): Promise<Either<AppError, BudgetLineView[]>> => {
    const items = await budget.listAll();
    if (isLeft(items)) return items;

    const categoryList = await categories.list();
    if (isLeft(categoryList)) return categoryList;

    const monthEntries = await entries.list({ month });
    if (isLeft(monthEntries)) return monthEntries;

    const templateItems = items.right.filter((item) => item.month === null);
    const overrideItems = items.right.filter((item) => item.month === month);
    const resolved = resolveBudget(items.right, month, categoryList.right);
    const templateAmounts = amountsByCategory(
      resolveBudget(templateItems, month, categoryList.right),
      templateItems,
    );
    const overrideAmounts = amountsByCategory(
      resolveBudget(overrideItems, month, categoryList.right),
      overrideItems,
    );

    return right(
      resolved.map((line) => ({
        ...line,
        templateAmount: templateAmounts.get(line.categoryUid) ?? null,
        overrideAmount: overrideAmounts.get(line.categoryUid) ?? null,
        actual: round2(
          monthEntries.right
            .filter((entry) => entry.categoryUid === line.categoryUid)
            .reduce((sum, entry) => sum + entry.amount, 0),
        ),
      })),
    );
  };
}

export function makeSaveTemplateItem(budget: FinanceBudgetRepository) {
  return async (
    categoryUid: string,
    amount: number,
  ): Promise<Either<AppError, BudgetItem>> => {
    const normalized = normalizeBudgetAmount(amount);
    if (isLeft(normalized)) return normalized;

    return budget.save({ categoryUid, month: null, amount: normalized.right });
  };
}

export function makeSaveMonthOverride(
  budget: FinanceBudgetRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    categoryUid: string,
    month: MonthKey,
    amount: number,
  ): Promise<Either<AppError, BudgetItem>> => {
    const normalized = normalizeBudgetAmount(amount);
    if (isLeft(normalized)) return normalized;

    const closing = await closings.findByMonth(month);
    if (isLeft(closing)) return closing;
    if (closing.right) return left(new MonthClosedError(month));

    return budget.save({ categoryUid, month, amount: normalized.right });
  };
}

export function makeRemoveBudgetItem(
  budget: FinanceBudgetRepository,
  closings: FinanceClosingRepository,
) {
  return async (uid: string): Promise<Either<AppError, void>> => {
    const items = await budget.listAll();
    if (isLeft(items)) return items;

    const item = items.right.find((candidate) => candidate.uid === uid);
    if (!item) return left(new BudgetItemNotFoundError());

    if (item.month !== null) {
      const closing = await closings.findByMonth(item.month);
      if (isLeft(closing)) return closing;
      if (closing.right) return left(new MonthClosedError(item.month));
    }

    return budget.remove(uid);
  };
}
