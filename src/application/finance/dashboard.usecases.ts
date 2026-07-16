import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  FinanceEntry,
  MonthKey,
} from '../../domain/finance/finance.entity';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import type { FinanceBudgetRepository } from '../../domain/finance/finance-budget.repository';
import type { FinanceCategoryRepository } from '../../domain/finance/finance-category.repository';
import type { FinanceMemberRepository } from '../../domain/finance/finance-member.repository';
import type { FinanceClosingRepository } from '../../domain/finance/finance-closing.repository';
import {
  currentMonthKey,
  resolveBudget,
  round2,
  summarizeMonth,
  type MonthSummary,
} from '../../domain/finance/finance.rules';
import { sumPaidBalance } from './projection.usecases';

export interface MemberInvolvement {
  memberUid: string;
  name: string;
  total: number;
  percent: number;
}

export interface FinanceDashboard {
  currentBalance: number;
  summary: MonthSummary;
  overdueEntries: FinanceEntry[];
  overdueTotal: number;
  pendingThisMonth: FinanceEntry[];
  memberInvolvement: MemberInvolvement[];
}

const sumAmounts = (list: FinanceEntry[]): number =>
  list.reduce((sum, entry) => sum + entry.amount, 0);

export function makeLoadFinanceDashboard(
  entries: FinanceEntryRepository,
  budget: FinanceBudgetRepository,
  categories: FinanceCategoryRepository,
  members: FinanceMemberRepository,
  closings: FinanceClosingRepository,
) {
  return async (
    month: MonthKey,
    nowMs: number,
  ): Promise<Either<AppError, FinanceDashboard>> => {
    const paid = await entries.listPaid();
    if (isLeft(paid)) return paid;
    const monthEntries = await entries.list({ month });
    if (isLeft(monthEntries)) return monthEntries;
    const pendingThisMonth = await entries.list({ month, status: 'pending' });
    if (isLeft(pendingThisMonth)) return pendingThisMonth;
    const overdue = await entries.list({
      status: 'pending',
      monthBefore: currentMonthKey(nowMs),
    });
    if (isLeft(overdue)) return overdue;
    const budgetItems = await budget.listAll();
    if (isLeft(budgetItems)) return budgetItems;
    const categoryList = await categories.list();
    if (isLeft(categoryList)) return categoryList;
    const memberList = await members.list();
    if (isLeft(memberList)) return memberList;
    const closedMonths = await closings.listClosedMonths();
    if (isLeft(closedMonths)) return closedMonths;

    const resolvedBudget = resolveBudget(
      budgetItems.right,
      month,
      categoryList.right,
    );
    const expenses = monthEntries.right.filter(
      (entry) => entry.kind === 'expense',
    );
    const totalExpense = sumAmounts(expenses);
    const memberInvolvement = memberList.right.map((member) => {
      const memberTotal = sumAmounts(
        expenses.filter((entry) => entry.memberUids.includes(member.uid)),
      );
      return {
        memberUid: member.uid,
        name: member.name,
        total: round2(memberTotal),
        percent:
          totalExpense > 0 ? round2((memberTotal / totalExpense) * 100) : 0,
      };
    });

    return right({
      currentBalance: sumPaidBalance(paid.right),
      summary: summarizeMonth(
        monthEntries.right,
        resolvedBudget,
        categoryList.right,
      ),
      overdueEntries: overdue.right,
      overdueTotal: round2(sumAmounts(overdue.right)),
      pendingThisMonth: [...pendingThisMonth.right].sort(
        (a, b) => a.date - b.date,
      ),
      memberInvolvement,
    });
  };
}
