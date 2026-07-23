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
  makeLoadBudget,
  makeRemoveBudgetItem,
  makeSaveMonthOverride,
  makeSaveTemplateItem,
} from './budget.usecases';

const MONTH: MonthKey = '2026-07';

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

describe('budget use cases', () => {
  let budget: FakeFinanceBudgetRepository;
  let categories: FakeFinanceCategoryRepository;
  let entries: FakeFinanceEntryRepository;
  let closings: FakeFinanceClosingRepository;
  let expenseCategory: FinanceCategory;
  let incomeCategory: FinanceCategory;

  beforeEach(async () => {
    budget = new FakeFinanceBudgetRepository();
    categories = new FakeFinanceCategoryRepository();
    entries = new FakeFinanceEntryRepository();
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

  describe('makeLoadBudget', () => {
    it('compõe modelo, override e real do mês por categoria', async () => {
      await budget.save({
        categoryUid: expenseCategory.uid,
        month: null,
        amount: 500,
      });
      await budget.save({
        categoryUid: expenseCategory.uid,
        month: MONTH,
        amount: 300,
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
          amount: 1000,
        }),
      );
      await entries.create(
        buildEntry({
          categoryUid: expenseCategory.uid,
          amount: 999,
          month: '2026-06',
        }),
      );

      const result = await makeLoadBudget(budget, categories, entries)(MONTH);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right).toEqual([
        {
          categoryUid: expenseCategory.uid,
          name: 'Mercado',
          kind: 'expense',
          amount: 300,
          fromOverride: true,
          templateAmount: 500,
          overrideAmount: 300,
          actual: 150,
        },
        {
          categoryUid: incomeCategory.uid,
          name: 'Salário',
          kind: 'income',
          amount: 0,
          fromOverride: false,
          templateAmount: null,
          overrideAmount: null,
          actual: 1000,
        },
      ]);
    });

    it('propaga falhas dos repositórios', async () => {
      const loadBudget = makeLoadBudget(budget, categories, entries);

      budget.failNext(new ConnectorError('falha'));
      const budgetFailure = await loadBudget(MONTH);
      expect(isLeft(budgetFailure)).toBe(true);

      categories.failNext(new ConnectorError('falha'));
      const categoriesFailure = await loadBudget(MONTH);
      expect(isLeft(categoriesFailure)).toBe(true);

      entries.failNext(new ConnectorError('falha'));
      const entriesFailure = await loadBudget(MONTH);
      expect(isLeft(entriesFailure)).toBe(true);
    });
  });

  describe('makeSaveTemplateItem', () => {
    it('salva item do modelo com month nulo e valor arredondado', async () => {
      const result = await makeSaveTemplateItem(budget)(
        expenseCategory.uid,
        100.006,
      );

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.month).toBeNull();
      expect(result.right.amount).toBe(100.01);
      expect(result.right.categoryUid).toBe(expenseCategory.uid);
    });

    it('aceita valor zero', async () => {
      const result = await makeSaveTemplateItem(budget)(expenseCategory.uid, 0);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.amount).toBe(0);
    });

    it('rejeita valor negativo ou não finito', async () => {
      const saveTemplateItem = makeSaveTemplateItem(budget);

      const negative = await saveTemplateItem(expenseCategory.uid, -1);
      expect(isLeft(negative)).toBe(true);
      if (isLeft(negative)) {
        expect(negative.left.code).toBe('finance/invalid-amount');
      }

      const infinite = await saveTemplateItem(expenseCategory.uid, Infinity);
      expect(isLeft(infinite)).toBe(true);
    });

    it('propaga falha do repositório', async () => {
      budget.failNext(new ConnectorError('falha'));

      const result = await makeSaveTemplateItem(budget)(
        expenseCategory.uid,
        100,
      );

      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeSaveMonthOverride', () => {
    it('salva override para mês aberto', async () => {
      const result = await makeSaveMonthOverride(budget, closings)(
        expenseCategory.uid,
        MONTH,
        250,
      );

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.month).toBe(MONTH);
      expect(result.right.amount).toBe(250);
    });

    it('rejeita override em mês fechado', async () => {
      await closings.create(buildClosing(MONTH));

      const result = await makeSaveMonthOverride(budget, closings)(
        expenseCategory.uid,
        MONTH,
        250,
      );

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/month-closed');
      }
    });

    it('rejeita valor inválido', async () => {
      const result = await makeSaveMonthOverride(budget, closings)(
        expenseCategory.uid,
        MONTH,
        -5,
      );

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/invalid-amount');
      }
    });

    it('propaga falhas dos repositórios', async () => {
      const saveMonthOverride = makeSaveMonthOverride(budget, closings);

      closings.failNext(new ConnectorError('falha'));
      const closingsFailure = await saveMonthOverride(
        expenseCategory.uid,
        MONTH,
        10,
      );
      expect(isLeft(closingsFailure)).toBe(true);

      budget.failNext(new ConnectorError('falha'));
      const budgetFailure = await saveMonthOverride(
        expenseCategory.uid,
        MONTH,
        10,
      );
      expect(isLeft(budgetFailure)).toBe(true);
    });
  });

  describe('makeRemoveBudgetItem', () => {
    it('remove item do modelo mesmo com mês fechado existente', async () => {
      await closings.create(buildClosing(MONTH));
      const saved = await budget.save({
        categoryUid: expenseCategory.uid,
        month: null,
        amount: 500,
      });
      if (isLeft(saved)) throw new Error('seed');

      const result = await makeRemoveBudgetItem(
        budget,
        closings,
      )(saved.right.uid);

      expect(isRight(result)).toBe(true);
      const remaining = await budget.listAll();
      if (isLeft(remaining)) throw new Error('list');
      expect(remaining.right).toHaveLength(0);
    });

    it('remove override de mês aberto', async () => {
      const saved = await budget.save({
        categoryUid: expenseCategory.uid,
        month: MONTH,
        amount: 300,
      });
      if (isLeft(saved)) throw new Error('seed');

      const result = await makeRemoveBudgetItem(
        budget,
        closings,
      )(saved.right.uid);

      expect(isRight(result)).toBe(true);
    });

    it('rejeita remoção de override de mês fechado', async () => {
      await closings.create(buildClosing(MONTH));
      const saved = await budget.save({
        categoryUid: expenseCategory.uid,
        month: MONTH,
        amount: 300,
      });
      if (isLeft(saved)) throw new Error('seed');

      const result = await makeRemoveBudgetItem(
        budget,
        closings,
      )(saved.right.uid);

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/month-closed');
      }
      const remaining = await budget.listAll();
      if (isLeft(remaining)) throw new Error('list');
      expect(remaining.right).toHaveLength(1);
    });

    it('rejeita uid inexistente', async () => {
      const result = await makeRemoveBudgetItem(budget, closings)('nope');

      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left.code).toBe('finance/budget-item-not-found');
      }
    });

    it('propaga falhas dos repositórios', async () => {
      const saved = await budget.save({
        categoryUid: expenseCategory.uid,
        month: MONTH,
        amount: 300,
      });
      if (isLeft(saved)) throw new Error('seed');
      const removeBudgetItem = makeRemoveBudgetItem(budget, closings);

      budget.failNext(new ConnectorError('falha'));
      const budgetFailure = await removeBudgetItem(saved.right.uid);
      expect(isLeft(budgetFailure)).toBe(true);

      closings.failNext(new ConnectorError('falha'));
      const closingsFailure = await removeBudgetItem(saved.right.uid);
      expect(isLeft(closingsFailure)).toBe(true);
    });
  });
});
