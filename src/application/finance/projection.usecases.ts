import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { InvalidMonthError } from '../../domain/errors';
import type {
  FinanceEntry,
  MonthKey,
} from '../../domain/finance/finance.entity';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceAutomationRepository } from '../../domain/finance/finance-automation.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import {
  addMonths,
  currentMonthKey,
  projectBalance,
  resolveBudget,
  round2,
  type ProjectionPoint,
  type ProjectionSource,
  type ResolvedBudgetLine,
} from '../../domain/finance/finance.rules';

export interface ProjectionInput {
  months: number;
  source: ProjectionSource;
  nowMs: number;
}

export const sumPaidBalance = (paid: FinanceEntry[]): number =>
  round2(
    paid.reduce(
      (sum, entry) =>
        sum + (entry.kind === 'income' ? entry.amount : -entry.amount),
      0,
    ),
  );

const isValidMonthCount = (months: number): boolean =>
  Number.isInteger(months) && months >= 1 && months <= 24;

export function makeLoadProjection(
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  automations: FinanceAutomationRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    input: ProjectionInput,
  ): Promise<Either<AppError, ProjectionPoint[]>> => {
    if (!isValidMonthCount(input.months)) {
      return left(new InvalidMonthError(String(input.months)));
    }
    const currentMonth = currentMonthKey(input.nowMs);
    const paid = await entries.listPaid();
    if (isLeft(paid)) return paid;
    const overdue = await entries.list({
      status: 'pending',
      monthBefore: currentMonth,
    });
    if (isLeft(overdue)) return overdue;
    const launchedFromRecurrences = await entries.list({
      source: 'recurrence',
    });
    if (isLeft(launchedFromRecurrences)) return launchedFromRecurrences;
    const budgetItems = await budget.listAll();
    if (isLeft(budgetItems)) return budgetItems;
    const categoryList = await categories.list();
    if (isLeft(categoryList)) return categoryList;
    const recurrences = await automations.listRecurrences();
    if (isLeft(recurrences)) return recurrences;
    const closedMonths = await closings.listClosedMonths();
    if (isLeft(closedMonths)) return closedMonths;

    const pendingByMonth = new Map<MonthKey, FinanceEntry[]>();
    const paidByMonth = new Map<MonthKey, FinanceEntry[]>();
    const budgetByMonth = new Map<MonthKey, ResolvedBudgetLine[]>();
    for (let i = 0; i < input.months; i += 1) {
      const month = addMonths(currentMonth, i);
      const pending = await entries.list({ status: 'pending', month });
      if (isLeft(pending)) return pending;
      pendingByMonth.set(month, pending.right);
      paidByMonth.set(
        month,
        paid.right.filter((entry) => entry.month === month),
      );
      budgetByMonth.set(
        month,
        resolveBudget(budgetItems.right, month, categoryList.right),
      );
    }

    return right(
      projectBalance({
        currentMonth,
        months: input.months,
        source: input.source,
        initialBalance: sumPaidBalance(paid.right),
        overdueEntries: overdue.right,
        pendingByMonth,
        paidByMonth,
        budgetByMonth,
        recurrences: recurrences.right,
        launchedBySourceMonth: launchedFromRecurrences.right,
        closedMonths: closedMonths.right,
      }),
    );
  };
}
