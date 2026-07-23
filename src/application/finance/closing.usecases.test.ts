import { beforeEach, describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import type {
  FinanceCategory,
  MonthKey,
  NewFinanceEntry,
  NewMonthClosing,
} from '../../domain/finance/finance.entity';
import { ConnectorError } from '../../infrastructure/errors';
import {
  FakeFinanceBudgetRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
} from './fakes';
import {
  makeCloseMonth,
  makeListClosings,
  makeLoadClosingPreview,
  makeReopenMonth,
} from './closing.usecases';

const MONTH: MonthKey = '2026-07';
const NOW_MS = new Date(2026, 6, 15).getTime();

const buildEntry = (overrides: Partial<NewFinanceEntry>): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Conta',
  amount: 100,
  kind: 'expense',
  categoryUid: 'cat',
  memberUids: [],
  date: 1,
  month: MONTH,
  status: 'pending',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  paymentMethodUid: null,
  invoiceMonth: null,
  invoiceUid: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const buildClosing = (month: MonthKey): NewMonthClosing => ({
  uid: createUid(),
  month,
  closedAt: 1,
  plannedIncome: 0,
  plannedExpense: 0,
  plannedBalance: 0,
  actualIncome: 0,
  actualExpense: 0,
  actualBalance: 0,
  categories: [],
});

describe('closing use cases', () => {
  let entries: FakeFinanceEntryRepository;
  let budget: FakeFinanceBudgetRepository;
  let categories: FakeFinanceCategoryRepository;
  let closings: FakeFinanceClosingRepository;
  let expenseCategory: FinanceCategory;
  let incomeCategory: FinanceCategory;

  beforeEach(async () => {
    entries = new FakeFinanceEntryRepository();
    budget = new FakeFinanceBudgetRepository();
    categories = new FakeFinanceCategoryRepository();
    closings = new FakeFinanceClosingRepository();
    const expense = await categories.create({
      name: 'Mercado',
      kind: 'expense',
    });
    const income = await categories.create({ name: 'Salário', kind: 'income' });
    if (isLeft(expense) || isLeft(income)) throw new Error('seed');
    expenseCategory = expense.right;
    incomeCategory = income.right;
  });

  const seedMonthData = async () => {
    await budget.save({
      categoryUid: expenseCategory.uid,
      month: null,
      amount: 400,
    });
    await budget.save({
      categoryUid: expenseCategory.uid,
      month: MONTH,
      amount: 300,
    });
    await budget.save({
      categoryUid: incomeCategory.uid,
      month: null,
      amount: 1000,
    });
    await entries.create(
      buildEntry({
        categoryUid: expenseCategory.uid,
        amount: 120,
        status: 'paid',
      }),
    );
    await entries.create(
      buildEntry({ categoryUid: expenseCategory.uid, amount: 30 }),
    );
    await entries.create(
      buildEntry({
        categoryUid: incomeCategory.uid,
        kind: 'income',
        amount: 900,
        status: 'paid',
      }),
    );
  };

  describe('makeLoadClosingPreview', () => {
    it('monta resumo do mês com pendentes e alreadyClosed falso', async () => {
      await seedMonthData();

      const result = await makeLoadClosingPreview(
        entries,
        budget,
        categories,
        closings,
      )(MONTH);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.month).toBe(MONTH);
      expect(result.right.alreadyClosed).toBe(false);
      expect(result.right.summary.plannedIncome).toBe(1000);
      expect(result.right.summary.plannedExpense).toBe(300);
      expect(result.right.summary.plannedBalance).toBe(700);
      expect(result.right.summary.actualIncome).toBe(900);
      expect(result.right.summary.actualExpense).toBe(150);
      expect(result.right.summary.actualBalance).toBe(750);
      expect(result.right.pendingEntries).toHaveLength(1);
      expect(result.right.pendingEntries[0].amount).toBe(30);
    });

    it('marca alreadyClosed quando o mês tem fechamento', async () => {
      await closings.create(buildClosing(MONTH));

      const result = await makeLoadClosingPreview(
        entries,
        budget,
        categories,
        closings,
      )(MONTH);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.alreadyClosed).toBe(true);
    });

    it('propaga falhas dos repositórios', async () => {
      const loadClosingPreview = makeLoadClosingPreview(
        entries,
        budget,
        categories,
        closings,
      );

      closings.failNext(new ConnectorError('falha'));
      expect(isLeft(await loadClosingPreview(MONTH))).toBe(true);

      entries.failNext(new ConnectorError('falha'));
      expect(isLeft(await loadClosingPreview(MONTH))).toBe(true);

      budget.failNext(new ConnectorError('falha'));
      expect(isLeft(await loadClosingPreview(MONTH))).toBe(true);

      categories.failNext(new ConnectorError('falha'));
      expect(isLeft(await loadClosingPreview(MONTH))).toBe(true);
    });
  });

  describe('makeCloseMonth', () => {
    it('fecha o mês com snapshot somando pagos e pendentes', async () => {
      await seedMonthData();

      const result = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )(MONTH, NOW_MS);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.month).toBe(MONTH);
      expect(result.right.closedAt).toBe(NOW_MS);
      expect(result.right.plannedIncome).toBe(1000);
      expect(result.right.plannedExpense).toBe(300);
      expect(result.right.plannedBalance).toBe(700);
      expect(result.right.actualIncome).toBe(900);
      expect(result.right.actualExpense).toBe(150);
      expect(result.right.actualBalance).toBe(750);
      expect(result.right.categories).toEqual([
        {
          categoryUid: expenseCategory.uid,
          name: 'Mercado',
          kind: 'expense',
          budgeted: 300,
          actual: 150,
        },
        {
          categoryUid: incomeCategory.uid,
          name: 'Salário',
          kind: 'income',
          budgeted: 1000,
          actual: 900,
        },
      ]);
    });

    it('congela os nomes das categorias no snapshot', async () => {
      await seedMonthData();
      const closed = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )(MONTH, NOW_MS);
      if (!isRight(closed)) throw new Error('close');

      await categories.update(expenseCategory.uid, { name: 'Feira' });

      const stored = await closings.findByMonth(MONTH);
      if (isLeft(stored) || !stored.right) throw new Error('find');
      expect(stored.right.categories[0].name).toBe('Mercado');
    });

    it('fecha mês passado', async () => {
      const result = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )('2026-01', NOW_MS);

      expect(isRight(result)).toBe(true);
    });

    it('rejeita mês futuro', async () => {
      const result = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )('2026-08', NOW_MS);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/invalid-month');
      }
    });

    it('rejeita chave de mês inválida', async () => {
      const result = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )('2020-99', NOW_MS);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/invalid-month');
      }
    });

    it('rejeita mês já fechado', async () => {
      await closings.create(buildClosing(MONTH));

      const result = await makeCloseMonth(
        entries,
        budget,
        categories,
        closings,
      )(MONTH, NOW_MS);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/month-already-closed');
      }
    });

    it('propaga falhas dos repositórios', async () => {
      const closeMonth = makeCloseMonth(entries, budget, categories, closings);

      closings.failNext(new ConnectorError('falha'));
      expect(isLeft(await closeMonth(MONTH, NOW_MS))).toBe(true);

      entries.failNext(new ConnectorError('falha'));
      expect(isLeft(await closeMonth(MONTH, NOW_MS))).toBe(true);
    });
  });

  describe('makeReopenMonth', () => {
    it('remove o fechamento do mês', async () => {
      await closings.create(buildClosing(MONTH));

      const result = await makeReopenMonth(closings)(MONTH);

      expect(isRight(result)).toBe(true);
      const remaining = await closings.list();
      if (isLeft(remaining)) throw new Error('list');
      expect(remaining.right).toHaveLength(0);
    });

    it('rejeita mês não fechado', async () => {
      const result = await makeReopenMonth(closings)(MONTH);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/month-not-closed');
      }
    });

    it('propaga falha do repositório', async () => {
      closings.failNext(new ConnectorError('falha'));

      const result = await makeReopenMonth(closings)(MONTH);

      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeListClosings', () => {
    it('lista os fechamentos', async () => {
      await closings.create(buildClosing('2026-02'));
      await closings.create(buildClosing('2026-01'));

      const result = await makeListClosings(closings)();

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.map((closing) => closing.month)).toEqual([
        '2026-01',
        '2026-02',
      ]);
    });

    it('propaga falha do repositório', async () => {
      closings.failNext(new ConnectorError('falha'));

      const result = await makeListClosings(closings)();

      expect(isLeft(result)).toBe(true);
    });
  });
});
