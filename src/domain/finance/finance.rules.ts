import { isRight, left, right, type Either } from '../shared/either';
import {
  InvalidFinanceAmountError,
  InvalidInstallmentCountError,
  MonthClosedError,
  RecurrenceAlreadyLaunchedError,
  RecurrenceOutOfRangeError,
  type DomainError,
} from '../errors';
import type {
  BudgetItem,
  FinanceCategory,
  FinanceEntry,
  FinanceKind,
  FormulaFilter,
  MonthKey,
  Recurrence,
} from './finance.entity';

export function monthKeyFromDate(ms: number): MonthKey {
  const date = new Date(ms);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [year, monthNumber] = month.split('-').map(Number);
  const total = year * 12 + (monthNumber - 1) + n;
  const resultYear = Math.floor(total / 12);
  const resultMonth = String((((total % 12) + 12) % 12) + 1).padStart(2, '0');
  return `${resultYear}-${resultMonth}`;
}

export function compareMonths(a: MonthKey, b: MonthKey): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isValidMonthKey(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function currentMonthKey(nowMs: number): MonthKey {
  return monthKeyFromDate(nowMs);
}

export function lastDayOfMonth(year: number, monthNumber: number): number {
  return new Date(year, monthNumber, 0).getDate();
}

export function dateForMonthDay(month: MonthKey, day: number): number {
  const [year, monthNumber] = month.split('-').map(Number);
  const clamped = Math.min(day, lastDayOfMonth(year, monthNumber));
  return new Date(year, monthNumber - 1, clamped).getTime();
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeAmount(
  n: number,
): Either<InvalidFinanceAmountError, number> {
  if (!Number.isFinite(n)) {
    return left(new InvalidFinanceAmountError());
  }
  const rounded = round2(n);
  if (rounded <= 0) {
    return left(new InvalidFinanceAmountError());
  }
  return right(rounded);
}

export function buildInstallmentAmounts(
  total: number,
  count: number,
): Either<InvalidInstallmentCountError, number[]> {
  if (!Number.isInteger(count) || count < 2) {
    return left(new InvalidInstallmentCountError());
  }
  if (!Number.isFinite(total) || total <= 0) {
    return left(new InvalidInstallmentCountError());
  }
  const base = round2(total / count);
  const last = round2(total - base * (count - 1));
  if (base <= 0 || last <= 0) {
    return left(new InvalidInstallmentCountError());
  }
  const amounts = Array.from({ length: count - 1 }, () => base);
  amounts.push(last);
  return right(amounts);
}

export function matchesFormulaFilter(
  entry: FinanceEntry,
  filter: FormulaFilter,
): boolean {
  if (entry.kind !== filter.kind) {
    return false;
  }
  if (
    filter.categoryUids.length > 0 &&
    !filter.categoryUids.includes(entry.categoryUid)
  ) {
    return false;
  }
  if (
    filter.memberUids.length > 0 &&
    !entry.memberUids.some((uid) => filter.memberUids.includes(uid))
  ) {
    return false;
  }
  return true;
}

export function canLaunchRecurrence(
  rec: Recurrence,
  month: MonthKey,
  alreadyLaunched: boolean,
  isMonthClosed: boolean,
): Either<DomainError, true> {
  const inRange =
    rec.active &&
    compareMonths(rec.startMonth, month) <= 0 &&
    (rec.endMonth === null || compareMonths(month, rec.endMonth) <= 0);
  if (!inRange) {
    return left(new RecurrenceOutOfRangeError());
  }
  if (isMonthClosed) {
    return left(new MonthClosedError(month));
  }
  if (alreadyLaunched) {
    return left(new RecurrenceAlreadyLaunchedError());
  }
  return right(true);
}

export interface VirtualRecurrenceAmount {
  categoryUid: string;
  kind: FinanceKind;
  amount: number;
}

export function virtualRecurrenceAmounts(
  recurrences: Recurrence[],
  launchedEntries: FinanceEntry[],
  month: MonthKey,
  isMonthClosed = false,
): VirtualRecurrenceAmount[] {
  return recurrences.flatMap((rec) => {
    const alreadyLaunched = launchedEntries.some(
      (entry) =>
        entry.source === 'recurrence' &&
        entry.sourceUid === rec.uid &&
        entry.month === month,
    );
    const launchable = canLaunchRecurrence(
      rec,
      month,
      alreadyLaunched,
      isMonthClosed,
    );
    if (!isRight(launchable)) {
      return [];
    }
    return [
      { categoryUid: rec.categoryUid, kind: rec.kind, amount: rec.amount },
    ];
  });
}

export interface ResolvedBudgetLine {
  categoryUid: string;
  name: string;
  kind: FinanceKind;
  amount: number;
  fromOverride: boolean;
}

function pickBudgetWinner(items: BudgetItem[]): BudgetItem | undefined {
  return items.reduce<BudgetItem | undefined>((winner, item) => {
    if (!winner) return item;
    if (item.updatedAt > winner.updatedAt) return item;
    if (item.updatedAt === winner.updatedAt && item.uid > winner.uid) {
      return item;
    }
    return winner;
  }, undefined);
}

export function resolveBudget(
  items: BudgetItem[],
  month: MonthKey,
  categories: FinanceCategory[],
): ResolvedBudgetLine[] {
  return categories.map((category) => {
    const forCategory = items.filter(
      (item) => item.categoryUid === category.uid,
    );
    const override = pickBudgetWinner(
      forCategory.filter((item) => item.month === month),
    );
    const template = pickBudgetWinner(
      forCategory.filter((item) => item.month === null),
    );
    const chosen = override ?? template;
    return {
      categoryUid: category.uid,
      name: category.name,
      kind: category.kind,
      amount: chosen ? chosen.amount : 0,
      fromOverride: override !== undefined,
    };
  });
}

export interface CategorySummaryLine {
  categoryUid: string;
  name: string;
  kind: FinanceKind;
  budgeted: number;
  actual: number;
}

export interface MonthSummary {
  plannedIncome: number;
  plannedExpense: number;
  plannedBalance: number;
  actualIncome: number;
  actualExpense: number;
  actualBalance: number;
  categories: CategorySummaryLine[];
}

function sumByKind(
  values: { kind: FinanceKind; amount: number }[],
  kind: FinanceKind,
): number {
  return round2(
    values
      .filter((value) => value.kind === kind)
      .reduce((sum, value) => sum + value.amount, 0),
  );
}

export function summarizeMonth(
  entries: FinanceEntry[],
  resolvedBudget: ResolvedBudgetLine[],
  categories: FinanceCategory[],
): MonthSummary {
  const plannedIncome = sumByKind(resolvedBudget, 'income');
  const plannedExpense = sumByKind(resolvedBudget, 'expense');
  const actualIncome = sumByKind(entries, 'income');
  const actualExpense = sumByKind(entries, 'expense');
  const lines = categories.map((category) => ({
    categoryUid: category.uid,
    name: category.name,
    kind: category.kind,
    budgeted:
      resolvedBudget.find((line) => line.categoryUid === category.uid)
        ?.amount ?? 0,
    actual: round2(
      entries
        .filter((entry) => entry.categoryUid === category.uid)
        .reduce((sum, entry) => sum + entry.amount, 0),
    ),
  }));
  return {
    plannedIncome,
    plannedExpense,
    plannedBalance: round2(plannedIncome - plannedExpense),
    actualIncome,
    actualExpense,
    actualBalance: round2(actualIncome - actualExpense),
    categories: lines,
  };
}

export interface ProjectionPoint {
  month: MonthKey;
  plannedIncome: number;
  plannedExpense: number;
  delta: number;
  balance: number;
}

export type ProjectionSource = 'entries' | 'budget' | 'both';

export interface ProjectionComputationInput {
  currentMonth: MonthKey;
  months: number;
  source: ProjectionSource;
  initialBalance: number;
  overdueEntries: FinanceEntry[];
  pendingByMonth: Map<MonthKey, FinanceEntry[]>;
  paidByMonth: Map<MonthKey, FinanceEntry[]>;
  budgetByMonth: Map<MonthKey, ResolvedBudgetLine[]>;
  recurrences: Recurrence[];
  launchedBySourceMonth: FinanceEntry[];
  closedMonths: MonthKey[];
}

interface KindTotals {
  income: number;
  expense: number;
}

function addToKind(totals: KindTotals, kind: FinanceKind, amount: number) {
  if (kind === 'income') {
    totals.income += amount;
  } else {
    totals.expense += amount;
  }
}

function entriesSourceTotals(
  pendings: FinanceEntry[],
  virtuals: VirtualRecurrenceAmount[],
): KindTotals {
  const totals: KindTotals = { income: 0, expense: 0 };
  for (const pending of pendings) {
    addToKind(totals, pending.kind, pending.amount);
  }
  for (const virtual of virtuals) {
    addToKind(totals, virtual.kind, virtual.amount);
  }
  return totals;
}

function paidByCategory(paid: FinanceEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of paid) {
    totals.set(
      entry.categoryUid,
      (totals.get(entry.categoryUid) ?? 0) + entry.amount,
    );
  }
  return totals;
}

function budgetSourceTotals(
  budgetLines: ResolvedBudgetLine[],
  paid: FinanceEntry[],
): KindTotals {
  const totals: KindTotals = { income: 0, expense: 0 };
  const paidTotals = paidByCategory(paid);
  for (const line of budgetLines) {
    const remaining = Math.max(
      line.amount - (paidTotals.get(line.categoryUid) ?? 0),
      0,
    );
    addToKind(totals, line.kind, remaining);
  }
  return totals;
}

interface BothCategoryAccumulator {
  kind: FinanceKind;
  budgeted: number;
  committed: number;
  paid: number;
}

function bothSourceTotals(
  budgetLines: ResolvedBudgetLine[],
  pendings: FinanceEntry[],
  virtuals: VirtualRecurrenceAmount[],
  paid: FinanceEntry[],
): KindTotals {
  const byCategory = new Map<string, BothCategoryAccumulator>();
  const accumulator = (categoryUid: string, kind: FinanceKind) => {
    const existing = byCategory.get(categoryUid);
    if (existing) return existing;
    const created: BothCategoryAccumulator = {
      kind,
      budgeted: 0,
      committed: 0,
      paid: 0,
    };
    byCategory.set(categoryUid, created);
    return created;
  };
  for (const line of budgetLines) {
    accumulator(line.categoryUid, line.kind).budgeted += line.amount;
  }
  for (const pending of pendings) {
    accumulator(pending.categoryUid, pending.kind).committed += pending.amount;
  }
  for (const virtual of virtuals) {
    accumulator(virtual.categoryUid, virtual.kind).committed += virtual.amount;
  }
  for (const entry of paid) {
    accumulator(entry.categoryUid, entry.kind).paid += entry.amount;
  }
  const totals: KindTotals = { income: 0, expense: 0 };
  for (const value of byCategory.values()) {
    const planned =
      Math.max(value.budgeted, value.committed + value.paid) - value.paid;
    addToKind(totals, value.kind, planned);
  }
  return totals;
}

export function projectBalance(
  input: ProjectionComputationInput,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let balance = input.initialBalance;
  for (let i = 0; i < input.months; i += 1) {
    const month = addMonths(input.currentMonth, i);
    const isCurrentMonth = i === 0;
    const pendings = input.pendingByMonth.get(month) ?? [];
    const paid = input.paidByMonth.get(month) ?? [];
    const isMonthClosed = isCurrentMonth && input.closedMonths.includes(month);
    const virtuals = virtualRecurrenceAmounts(
      input.recurrences,
      input.launchedBySourceMonth,
      month,
      isMonthClosed,
    );
    const budgetLines = input.budgetByMonth.get(month) ?? [];
    let totals: KindTotals;
    if (input.source === 'entries') {
      totals = entriesSourceTotals(pendings, virtuals);
    } else if (input.source === 'budget') {
      totals = budgetSourceTotals(budgetLines, paid);
    } else {
      totals = bothSourceTotals(budgetLines, pendings, virtuals, paid);
    }
    if (isCurrentMonth) {
      for (const overdue of input.overdueEntries) {
        addToKind(totals, overdue.kind, overdue.amount);
      }
    }
    const plannedIncome = round2(totals.income);
    const plannedExpense = round2(totals.expense);
    const delta = round2(plannedIncome - plannedExpense);
    balance = round2(balance + delta);
    points.push({ month, plannedIncome, plannedExpense, delta, balance });
  }
  return points;
}
