import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import {
  InvalidFinanceAmountError,
  InvalidInstallmentCountError,
  MonthClosedError,
  RecurrenceAlreadyLaunchedError,
  RecurrenceOutOfRangeError,
} from '../errors';
import type {
  BudgetItem,
  FinanceCategory,
  FinanceEntry,
  FormulaFilter,
  Recurrence,
} from './finance.entity';
import {
  addMonths,
  buildInstallmentAmounts,
  canLaunchRecurrence,
  compareMonths,
  currentMonthKey,
  dateForMonthDay,
  isValidMonthKey,
  matchesFormulaFilter,
  monthKeyFromDate,
  normalizeAmount,
  projectBalance,
  resolveBudget,
  round2,
  summarizeMonth,
  virtualRecurrenceAmounts,
  type ProjectionComputationInput,
  type ResolvedBudgetLine,
} from './finance.rules';

const entry = (over: Partial<FinanceEntry> = {}): FinanceEntry => ({
  id: 1,
  uid: 'entry-1',
  description: 'Compra',
  amount: 100,
  kind: 'expense',
  categoryUid: 'cat-a',
  memberUids: ['member-1'],
  date: new Date(2026, 6, 10).getTime(),
  month: '2026-07',
  status: 'pending',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const recurrence = (over: Partial<Recurrence> = {}): Recurrence => ({
  id: 1,
  uid: 'rec-1',
  description: 'Aluguel',
  amount: 80,
  kind: 'expense',
  categoryUid: 'cat-a',
  memberUids: ['member-1'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const category = (over: Partial<FinanceCategory> = {}): FinanceCategory => ({
  id: 1,
  uid: 'cat-a',
  name: 'Mercado',
  kind: 'expense',
  archived: false,
  createdAt: 0,
  ...over,
});

const budgetItem = (over: Partial<BudgetItem> = {}): BudgetItem => ({
  id: 1,
  uid: 'budget-1',
  categoryUid: 'cat-a',
  amount: 100,
  month: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const budgetLine = (
  over: Partial<ResolvedBudgetLine> = {},
): ResolvedBudgetLine => ({
  categoryUid: 'cat-a',
  name: 'Mercado',
  kind: 'expense',
  amount: 0,
  fromOverride: false,
  ...over,
});

const projectionInput = (
  over: Partial<ProjectionComputationInput> = {},
): ProjectionComputationInput => ({
  currentMonth: '2026-07',
  months: 1,
  source: 'entries',
  initialBalance: 0,
  overdueEntries: [],
  pendingByMonth: new Map(),
  paidByMonth: new Map(),
  budgetByMonth: new Map(),
  recurrences: [],
  launchedBySourceMonth: [],
  closedMonths: [],
  ...over,
});

describe('monthKeyFromDate', () => {
  it('formats a date with a single-digit month padding it', () => {
    expect(monthKeyFromDate(new Date(2026, 0, 15).getTime())).toBe('2026-01');
  });

  it('formats a date with a two-digit month', () => {
    expect(monthKeyFromDate(new Date(2026, 11, 31).getTime())).toBe('2026-12');
  });
});

describe('addMonths', () => {
  it('adds months within the same year', () => {
    expect(addMonths('2026-03', 2)).toBe('2026-05');
  });

  it('adds months crossing the year boundary', () => {
    expect(addMonths('2026-10', 6)).toBe('2027-04');
  });

  it('subtracts months crossing the year boundary', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('subtracts months crossing multiple years', () => {
    expect(addMonths('2026-03', -15)).toBe('2024-12');
  });

  it('returns the same month for zero', () => {
    expect(addMonths('2026-07', 0)).toBe('2026-07');
  });
});

describe('compareMonths', () => {
  it('returns a negative value when the first month is earlier', () => {
    expect(compareMonths('2026-06', '2026-07')).toBeLessThan(0);
  });

  it('returns a positive value when the first month is later', () => {
    expect(compareMonths('2027-01', '2026-12')).toBeGreaterThan(0);
  });

  it('returns zero for equal months', () => {
    expect(compareMonths('2026-07', '2026-07')).toBe(0);
  });
});

describe('isValidMonthKey', () => {
  it('accepts a valid month key', () => {
    expect(isValidMonthKey('2026-07')).toBe(true);
  });

  it('accepts december', () => {
    expect(isValidMonthKey('2026-12')).toBe(true);
  });

  it('rejects month 13', () => {
    expect(isValidMonthKey('2026-13')).toBe(false);
  });

  it('rejects month 00', () => {
    expect(isValidMonthKey('2026-00')).toBe(false);
  });

  it('rejects an unpadded month', () => {
    expect(isValidMonthKey('2026-7')).toBe(false);
  });

  it('rejects a string without separator', () => {
    expect(isValidMonthKey('202607')).toBe(false);
  });

  it('rejects arbitrary text', () => {
    expect(isValidMonthKey('mês inválido')).toBe(false);
  });
});

describe('currentMonthKey', () => {
  it('returns the month key of the given instant', () => {
    expect(currentMonthKey(new Date(2026, 6, 16).getTime())).toBe('2026-07');
  });
});

describe('dateForMonthDay', () => {
  it('returns the local timestamp for the given month and day', () => {
    expect(dateForMonthDay('2026-07', 15)).toBe(
      new Date(2026, 6, 15).getTime(),
    );
  });
});

describe('round2', () => {
  it('rounds up at the third decimal', () => {
    expect(round2(10.126)).toBe(10.13);
  });

  it('rounds down at the third decimal', () => {
    expect(round2(10.124)).toBe(10.12);
  });

  it('keeps integers untouched', () => {
    expect(round2(5)).toBe(5);
  });
});

describe('normalizeAmount', () => {
  it('rounds a valid amount to two decimals', () => {
    const result = normalizeAmount(10.126);
    expect(isRight(result) && result.right).toBe(10.13);
  });

  it('rejects zero', () => {
    const result = normalizeAmount(0);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidFinanceAmountError);
    }
  });

  it('rejects a negative amount', () => {
    expect(isLeft(normalizeAmount(-5))).toBe(true);
  });

  it('rejects NaN', () => {
    expect(isLeft(normalizeAmount(Number.NaN))).toBe(true);
  });

  it('rejects infinity', () => {
    expect(isLeft(normalizeAmount(Number.POSITIVE_INFINITY))).toBe(true);
  });

  it('rejects an amount that rounds to zero', () => {
    expect(isLeft(normalizeAmount(0.001))).toBe(true);
  });
});

describe('buildInstallmentAmounts', () => {
  it('splits 100.02 in 3 without float residue', () => {
    const result = buildInstallmentAmounts(100.02, 3);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual([33.34, 33.34, 33.34]);
      expect(round2(result.right.reduce((sum, n) => sum + n, 0))).toBe(100.02);
    }
  });

  it('adjusts the last installment to preserve the total', () => {
    const result = buildInstallmentAmounts(100, 3);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual([33.33, 33.33, 33.34]);
      expect(round2(result.right.reduce((sum, n) => sum + n, 0))).toBe(100);
    }
  });

  it('rejects 0.05 in 10 installments', () => {
    const result = buildInstallmentAmounts(0.05, 10);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidInstallmentCountError);
    }
  });

  it('rejects a count below 2', () => {
    expect(isLeft(buildInstallmentAmounts(100, 1))).toBe(true);
  });

  it('rejects a non-integer count', () => {
    expect(isLeft(buildInstallmentAmounts(100, 2.5))).toBe(true);
  });

  it('rejects a non-finite total', () => {
    const result = buildInstallmentAmounts(Number.POSITIVE_INFINITY, 3);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidInstallmentCountError);
    }
  });

  it('rejects a total of zero', () => {
    expect(isLeft(buildInstallmentAmounts(0, 3))).toBe(true);
  });

  it('rejects a negative total', () => {
    expect(isLeft(buildInstallmentAmounts(-10, 3))).toBe(true);
  });

  it('rejects 0.04 in 10 installments because the base rounds to zero', () => {
    const result = buildInstallmentAmounts(0.04, 10);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidInstallmentCountError);
    }
  });
});

describe('matchesFormulaFilter', () => {
  const filter = (over: Partial<FormulaFilter> = {}): FormulaFilter => ({
    kind: 'income',
    categoryUids: [],
    memberUids: [],
    ...over,
  });

  it('matches when only the kind is restricted', () => {
    expect(matchesFormulaFilter(entry({ kind: 'income' }), filter())).toBe(
      true,
    );
  });

  it('rejects a different kind', () => {
    expect(matchesFormulaFilter(entry({ kind: 'expense' }), filter())).toBe(
      false,
    );
  });

  it('matches when the category is listed', () => {
    expect(
      matchesFormulaFilter(
        entry({ kind: 'income', categoryUid: 'cat-pj' }),
        filter({ categoryUids: ['cat-pj', 'cat-other'] }),
      ),
    ).toBe(true);
  });

  it('rejects when the category is not listed', () => {
    expect(
      matchesFormulaFilter(
        entry({ kind: 'income', categoryUid: 'cat-a' }),
        filter({ categoryUids: ['cat-pj'] }),
      ),
    ).toBe(false);
  });

  it('matches when at least one member intersects', () => {
    expect(
      matchesFormulaFilter(
        entry({ kind: 'income', memberUids: ['member-1', 'member-2'] }),
        filter({ memberUids: ['member-2'] }),
      ),
    ).toBe(true);
  });

  it('rejects when no member intersects', () => {
    expect(
      matchesFormulaFilter(
        entry({ kind: 'income', memberUids: ['member-1'] }),
        filter({ memberUids: ['member-2'] }),
      ),
    ).toBe(false);
  });
});

describe('canLaunchRecurrence', () => {
  it('allows an active recurrence inside the range', () => {
    const result = canLaunchRecurrence(recurrence(), '2026-07', false, false);
    expect(isRight(result) && result.right).toBe(true);
  });

  it('allows the month equal to endMonth', () => {
    expect(
      isRight(
        canLaunchRecurrence(
          recurrence({ endMonth: '2026-07' }),
          '2026-07',
          false,
          false,
        ),
      ),
    ).toBe(true);
  });

  it('rejects an inactive recurrence', () => {
    const result = canLaunchRecurrence(
      recurrence({ active: false }),
      '2026-07',
      false,
      false,
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(RecurrenceOutOfRangeError);
    }
  });

  it('rejects a month before startMonth', () => {
    const result = canLaunchRecurrence(
      recurrence({ startMonth: '2026-08' }),
      '2026-07',
      false,
      false,
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(RecurrenceOutOfRangeError);
    }
  });

  it('rejects a month after endMonth', () => {
    const result = canLaunchRecurrence(
      recurrence({ endMonth: '2026-06' }),
      '2026-07',
      false,
      false,
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(RecurrenceOutOfRangeError);
    }
  });

  it('rejects a closed month', () => {
    const result = canLaunchRecurrence(recurrence(), '2026-07', false, true);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(MonthClosedError);
      expect(result.left.code).toBe('finance/month-closed');
    }
  });

  it('rejects an already launched recurrence', () => {
    const result = canLaunchRecurrence(recurrence(), '2026-07', true, false);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(RecurrenceAlreadyLaunchedError);
    }
  });
});

describe('virtualRecurrenceAmounts', () => {
  it('includes an eligible recurrence not launched in the month', () => {
    expect(virtualRecurrenceAmounts([recurrence()], [], '2026-07')).toEqual([
      { categoryUid: 'cat-a', kind: 'expense', amount: 80 },
    ]);
  });

  it('excludes a recurrence already launched in the month', () => {
    const launched = entry({
      source: 'recurrence',
      sourceUid: 'rec-1',
      month: '2026-07',
    });
    expect(
      virtualRecurrenceAmounts([recurrence()], [launched], '2026-07'),
    ).toEqual([]);
  });

  it('keeps a recurrence launched only in another month', () => {
    const launched = entry({
      source: 'recurrence',
      sourceUid: 'rec-1',
      month: '2026-06',
    });
    expect(
      virtualRecurrenceAmounts([recurrence()], [launched], '2026-07'),
    ).toHaveLength(1);
  });

  it('ignores entries from other sources with the same sourceUid', () => {
    const formulaEntry = entry({
      source: 'formula',
      sourceUid: 'rec-1',
      month: '2026-07',
    });
    expect(
      virtualRecurrenceAmounts([recurrence()], [formulaEntry], '2026-07'),
    ).toHaveLength(1);
  });

  it('excludes inactive and out-of-range recurrences', () => {
    const recurrences = [
      recurrence({ uid: 'rec-off', active: false }),
      recurrence({ uid: 'rec-future', startMonth: '2026-09' }),
      recurrence({ uid: 'rec-ended', endMonth: '2026-05' }),
    ];
    expect(virtualRecurrenceAmounts(recurrences, [], '2026-07')).toEqual([]);
  });

  it('excludes every recurrence when the month is closed', () => {
    expect(
      virtualRecurrenceAmounts([recurrence()], [], '2026-07', true),
    ).toEqual([]);
  });
});

describe('resolveBudget', () => {
  const categories = [
    category({ uid: 'cat-a', name: 'Mercado' }),
    category({ uid: 'cat-b', name: 'Transporte' }),
    category({ uid: 'cat-c', name: 'Lazer' }),
    category({ uid: 'cat-d', name: 'Salário', kind: 'income' }),
  ];

  it('lets the month override win over the template', () => {
    const items = [
      budgetItem({ uid: 'b-1', categoryUid: 'cat-a', amount: 300 }),
      budgetItem({
        uid: 'b-2',
        categoryUid: 'cat-a',
        amount: 450,
        month: '2026-07',
      }),
    ];
    const lines = resolveBudget(items, '2026-07', categories);
    expect(lines[0]).toEqual({
      categoryUid: 'cat-a',
      name: 'Mercado',
      kind: 'expense',
      amount: 450,
      fromOverride: true,
    });
  });

  it('falls back to the template when there is no override for the month', () => {
    const items = [
      budgetItem({ uid: 'b-1', categoryUid: 'cat-a', amount: 300 }),
      budgetItem({
        uid: 'b-2',
        categoryUid: 'cat-a',
        amount: 999,
        month: '2026-08',
      }),
    ];
    const lines = resolveBudget(items, '2026-07', categories);
    expect(lines[0].amount).toBe(300);
    expect(lines[0].fromOverride).toBe(false);
  });

  it('defaults to zero for a category without items', () => {
    const lines = resolveBudget([], '2026-07', categories);
    expect(lines).toHaveLength(4);
    expect(lines.every((line) => line.amount === 0)).toBe(true);
    expect(lines.every((line) => line.fromOverride === false)).toBe(true);
  });

  it('resolves duplicates by the greatest updatedAt regardless of order', () => {
    const items = [
      budgetItem({
        uid: 'b-2',
        categoryUid: 'cat-b',
        amount: 120,
        updatedAt: 9,
      }),
      budgetItem({ uid: 'b-1', categoryUid: 'cat-b', amount: 100 }),
      budgetItem({
        uid: 'b-3',
        categoryUid: 'cat-b',
        amount: 120,
        updatedAt: 12,
      }),
    ];
    const lines = resolveBudget(items, '2026-07', categories);
    expect(lines[1].amount).toBe(120);
  });

  it('breaks updatedAt ties by uid', () => {
    const items = [
      budgetItem({
        uid: 'b-a',
        categoryUid: 'cat-c',
        amount: 60,
        month: '2026-07',
        updatedAt: 5,
      }),
      budgetItem({
        uid: 'b-z',
        categoryUid: 'cat-c',
        amount: 70,
        month: '2026-07',
        updatedAt: 5,
      }),
    ];
    const lines = resolveBudget(items, '2026-07', categories);
    expect(lines[2].amount).toBe(70);
    expect(lines[2].fromOverride).toBe(true);
  });

  it('ignores items of unknown categories', () => {
    const items = [
      budgetItem({ uid: 'b-x', categoryUid: 'cat-unknown', amount: 500 }),
    ];
    const lines = resolveBudget(items, '2026-07', categories);
    expect(lines.map((line) => line.categoryUid)).toEqual([
      'cat-a',
      'cat-b',
      'cat-c',
      'cat-d',
    ]);
  });
});

describe('summarizeMonth', () => {
  const categories = [
    category({ uid: 'cat-a', name: 'Mercado' }),
    category({ uid: 'cat-b', name: 'Salário', kind: 'income' }),
    category({ uid: 'cat-c', name: 'Lazer' }),
  ];
  const resolvedBudget = [
    budgetLine({ categoryUid: 'cat-a', name: 'Mercado', amount: 500 }),
    budgetLine({
      categoryUid: 'cat-b',
      name: 'Salário',
      kind: 'income',
      amount: 2000,
    }),
  ];
  const entries = [
    entry({ uid: 'e-1', categoryUid: 'cat-a', amount: 200, status: 'paid' }),
    entry({ uid: 'e-2', categoryUid: 'cat-a', amount: 100 }),
    entry({
      uid: 'e-3',
      categoryUid: 'cat-b',
      kind: 'income',
      amount: 1500,
    }),
    entry({ uid: 'e-4', categoryUid: 'cat-x', amount: 30 }),
  ];

  it('computes planned totals from the resolved budget', () => {
    const summary = summarizeMonth(entries, resolvedBudget, categories);
    expect(summary.plannedIncome).toBe(2000);
    expect(summary.plannedExpense).toBe(500);
    expect(summary.plannedBalance).toBe(1500);
  });

  it('computes actual totals from all entries regardless of status', () => {
    const summary = summarizeMonth(entries, resolvedBudget, categories);
    expect(summary.actualIncome).toBe(1500);
    expect(summary.actualExpense).toBe(330);
    expect(summary.actualBalance).toBe(1170);
  });

  it('builds one line per category with budgeted and actual values', () => {
    const summary = summarizeMonth(entries, resolvedBudget, categories);
    expect(summary.categories).toEqual([
      {
        categoryUid: 'cat-a',
        name: 'Mercado',
        kind: 'expense',
        budgeted: 500,
        actual: 300,
      },
      {
        categoryUid: 'cat-b',
        name: 'Salário',
        kind: 'income',
        budgeted: 2000,
        actual: 1500,
      },
      {
        categoryUid: 'cat-c',
        name: 'Lazer',
        kind: 'expense',
        budgeted: 0,
        actual: 0,
      },
    ]);
  });
});

describe('projectBalance', () => {
  it('returns a flat point when there is no data', () => {
    const points = projectBalance(projectionInput({ initialBalance: 100 }));
    expect(points).toEqual([
      {
        month: '2026-07',
        plannedIncome: 0,
        plannedExpense: 0,
        delta: 0,
        balance: 100,
      },
    ]);
  });

  describe('entries source', () => {
    const launchedRecurrenceEntry = entry({
      uid: 'e-rec',
      source: 'recurrence',
      sourceUid: 'rec-1',
      amount: 80,
      month: '2026-07',
    });
    const input = projectionInput({
      months: 2,
      initialBalance: 500,
      overdueEntries: [
        entry({ uid: 'e-old-1', amount: 100, month: '2026-05' }),
        entry({ uid: 'e-old-2', amount: 50, month: '2026-06' }),
      ],
      pendingByMonth: new Map([
        [
          '2026-07',
          [
            entry({ uid: 'e-1', amount: 200 }),
            entry({ uid: 'e-2', kind: 'income', amount: 1000 }),
            launchedRecurrenceEntry,
          ],
        ],
        ['2026-08', [entry({ uid: 'e-3', amount: 300, month: '2026-08' })]],
      ]),
      recurrences: [
        recurrence(),
        recurrence({ uid: 'rec-off', active: false, amount: 999 }),
        recurrence({ uid: 'rec-late', startMonth: '2026-09', amount: 111 }),
      ],
      launchedBySourceMonth: [launchedRecurrenceEntry],
    });

    it('adds overdue entries only at point zero and avoids double counting launched recurrences', () => {
      const points = projectBalance(input);
      expect(points[0]).toEqual({
        month: '2026-07',
        plannedIncome: 1000,
        plannedExpense: 430,
        delta: 570,
        balance: 1070,
      });
    });

    it('projects future months with pendings plus virtual recurrences', () => {
      const points = projectBalance(input);
      expect(points[1]).toEqual({
        month: '2026-08',
        plannedIncome: 0,
        plannedExpense: 380,
        delta: -380,
        balance: 690,
      });
    });
  });

  describe('budget source', () => {
    const budgetLines = [
      budgetLine({ categoryUid: 'cat-a', amount: 500 }),
      budgetLine({ categoryUid: 'cat-b', kind: 'income', amount: 2000 }),
    ];
    const input = projectionInput({
      months: 3,
      source: 'budget',
      initialBalance: 1000,
      overdueEntries: [
        entry({ uid: 'e-old-1', amount: 150, month: '2026-06' }),
        entry({
          uid: 'e-old-2',
          kind: 'income',
          categoryUid: 'cat-b',
          amount: 40,
          month: '2026-05',
        }),
      ],
      paidByMonth: new Map([
        [
          '2026-07',
          [
            entry({ uid: 'e-paid-1', amount: 200, status: 'paid' }),
            entry({
              uid: 'e-paid-2',
              kind: 'income',
              categoryUid: 'cat-b',
              amount: 2500,
              status: 'paid',
            }),
          ],
        ],
      ]),
      budgetByMonth: new Map([
        ['2026-07', budgetLines],
        ['2026-08', budgetLines],
      ]),
    });

    it('subtracts paid amounts from the current month budget clamping at zero', () => {
      const points = projectBalance(input);
      expect(points[0]).toEqual({
        month: '2026-07',
        plannedIncome: 40,
        plannedExpense: 450,
        delta: -410,
        balance: 590,
      });
    });

    it('uses the resolved budget for future months', () => {
      const points = projectBalance(input);
      expect(points[1]).toEqual({
        month: '2026-08',
        plannedIncome: 2000,
        plannedExpense: 500,
        delta: 1500,
        balance: 2090,
      });
    });

    it('treats months without budget as zero', () => {
      const points = projectBalance(input);
      expect(points[2]).toEqual({
        month: '2026-09',
        plannedIncome: 0,
        plannedExpense: 0,
        delta: 0,
        balance: 2090,
      });
    });

    it('subtracts a future installment already paid from that month budget', () => {
      const points = projectBalance(
        projectionInput({
          months: 2,
          source: 'budget',
          paidByMonth: new Map([
            [
              '2026-08',
              [
                entry({
                  uid: 'e-paid-future',
                  amount: 200,
                  month: '2026-08',
                  status: 'paid',
                }),
              ],
            ],
          ]),
          budgetByMonth: new Map([
            ['2026-07', [budgetLine({ categoryUid: 'cat-a', amount: 500 })]],
            ['2026-08', [budgetLine({ categoryUid: 'cat-a', amount: 500 })]],
          ]),
        }),
      );
      expect(points[0].plannedExpense).toBe(500);
      expect(points[1].plannedExpense).toBe(300);
      expect(points[1].balance).toBe(-800);
    });
  });

  describe('both source', () => {
    const budgetLines = [
      budgetLine({ categoryUid: 'cat-a', amount: 500 }),
      budgetLine({ categoryUid: 'cat-b', kind: 'income', amount: 2000 }),
    ];
    const input = projectionInput({
      months: 2,
      source: 'both',
      overdueEntries: [
        entry({ uid: 'e-old-1', amount: 150, month: '2026-06' }),
      ],
      pendingByMonth: new Map([
        [
          '2026-07',
          [
            entry({ uid: 'e-1', amount: 100 }),
            entry({ uid: 'e-2', categoryUid: 'cat-c', amount: 50 }),
          ],
        ],
        ['2026-08', [entry({ uid: 'e-3', amount: 600, month: '2026-08' })]],
      ]),
      paidByMonth: new Map([
        [
          '2026-07',
          [
            entry({ uid: 'e-paid-1', amount: 200, status: 'paid' }),
            entry({
              uid: 'e-paid-2',
              kind: 'income',
              categoryUid: 'cat-b',
              amount: 2100,
              status: 'paid',
            }),
          ],
        ],
      ]),
      budgetByMonth: new Map([
        ['2026-07', budgetLines],
        ['2026-08', budgetLines],
      ]),
      recurrences: [recurrence()],
    });

    it('takes the max between budget and committed values without double counting paid amounts', () => {
      const points = projectBalance(input);
      expect(points[0]).toEqual({
        month: '2026-07',
        plannedIncome: 0,
        plannedExpense: 500,
        delta: -500,
        balance: -500,
      });
    });

    it('takes the max between budget and pendings plus virtual recurrences for future months', () => {
      const points = projectBalance(input);
      expect(points[1]).toEqual({
        month: '2026-08',
        plannedIncome: 2000,
        plannedExpense: 680,
        delta: 1320,
        balance: 820,
      });
    });

    it('keeps pendings above budget without double counting in the current month', () => {
      const points = projectBalance(
        projectionInput({
          source: 'both',
          pendingByMonth: new Map([
            ['2026-07', [entry({ uid: 'e-1', amount: 400 })]],
          ]),
          paidByMonth: new Map([
            [
              '2026-07',
              [entry({ uid: 'e-paid', amount: 200, status: 'paid' })],
            ],
          ]),
          budgetByMonth: new Map([
            ['2026-07', [budgetLine({ categoryUid: 'cat-a', amount: 500 })]],
          ]),
        }),
      );
      expect(points[0].plannedExpense).toBe(400);
    });

    it('subtracts a future installment already paid without double counting', () => {
      const points = projectBalance(
        projectionInput({
          months: 2,
          source: 'both',
          pendingByMonth: new Map([
            ['2026-08', [entry({ uid: 'e-1', amount: 100, month: '2026-08' })]],
          ]),
          paidByMonth: new Map([
            [
              '2026-08',
              [
                entry({
                  uid: 'e-paid-future',
                  amount: 200,
                  month: '2026-08',
                  status: 'paid',
                }),
              ],
            ],
          ]),
          budgetByMonth: new Map([
            ['2026-08', [budgetLine({ categoryUid: 'cat-a', amount: 500 })]],
          ]),
        }),
      );
      expect(points[1].plannedExpense).toBe(300);
      expect(points[1].balance).toBe(-300);
    });
  });

  describe('closed current month', () => {
    it('suppresses virtual recurrences at point zero when the current month is closed', () => {
      const points = projectBalance(
        projectionInput({
          months: 2,
          recurrences: [recurrence()],
          closedMonths: ['2026-07'],
        }),
      );
      expect(points[0].plannedExpense).toBe(0);
      expect(points[1].plannedExpense).toBe(80);
    });
  });
});
