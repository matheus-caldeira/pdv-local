import { describe, expect, it } from 'vitest';
import { isLeft, isRight, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import { FinanceCategoryInUseError } from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  NewFinanceEntry,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewRecurrence,
} from '../../domain/finance/finance.entity';
import {
  FakeFinanceAutomationRepository,
  FakeFinanceBudgetRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceEntryRepository,
} from './fakes';
import {
  makeCreateCategory,
  makeDeleteCategory,
  makeListCategories,
  makeUpdateCategory,
} from './categories.usecases';

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const makeEntry = (categoryUid: string): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Mercado',
  amount: 120,
  kind: 'expense',
  categoryUid,
  memberUids: ['member-me'],
  date: 100,
  month: '2026-07',
  status: 'pending',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  createdAt: 1,
  updatedAt: 1,
});

const makeFormula = (
  overrides: Partial<NewFinanceFormula>,
): NewFinanceFormula => ({
  uid: createUid(),
  name: 'DARF',
  percent: 15,
  filter: { kind: 'income', categoryUids: [], memberUids: [] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-other',
  outputDescription: 'DARF',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makeRecurrence = (categoryUid: string): NewRecurrence => ({
  uid: createUid(),
  description: 'Aluguel',
  amount: 1500,
  kind: 'expense',
  categoryUid,
  memberUids: ['member-me'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
});

const makePlan = (categoryUid: string): NewInstallmentPlan => ({
  uid: createUid(),
  description: 'Notebook',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-08',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid,
  memberUids: ['member-me'],
  createdAt: 1,
});

const setup = () => {
  const categories = new FakeFinanceCategoryRepository();
  const entries = new FakeFinanceEntryRepository();
  const budget = new FakeFinanceBudgetRepository();
  const automations = new FakeFinanceAutomationRepository();
  const deleteCategory = makeDeleteCategory(
    categories,
    entries,
    budget,
    automations,
  );
  return { categories, entries, budget, automations, deleteCategory };
};

describe('makeListCategories', () => {
  it('retorna as categorias cadastradas', async () => {
    const { categories } = setup();
    await categories.create({ name: 'Mercado', kind: 'expense' });
    await categories.create({ name: 'Salário', kind: 'income' });

    const result = unwrap(await makeListCategories(categories)());

    expect(result.map((category) => category.name)).toEqual([
      'Mercado',
      'Salário',
    ]);
  });

  it('propaga falha de infraestrutura', async () => {
    const { categories } = setup();
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(unwrapLeft(await makeListCategories(categories)())).toBe(error);
  });
});

describe('makeCreateCategory', () => {
  it('cria a categoria com nome aparado e o kind informado', async () => {
    const { categories } = setup();

    const created = unwrap(
      await makeCreateCategory(categories)({
        name: '  Mercado  ',
        kind: 'expense',
      }),
    );

    expect(created.name).toBe('Mercado');
    expect(created.kind).toBe('expense');
    expect(created.archived).toBe(false);
  });

  it('propaga falha de infraestrutura', async () => {
    const { categories } = setup();
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(
      unwrapLeft(
        await makeCreateCategory(categories)({
          name: 'Mercado',
          kind: 'expense',
        }),
      ),
    ).toBe(error);
  });
});

describe('makeUpdateCategory', () => {
  it('renomeia aparando o nome', async () => {
    const { categories } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );

    const updated = unwrap(
      await makeUpdateCategory(categories)(created.uid, {
        name: '  Feira  ',
      }),
    );

    expect(updated.name).toBe('Feira');
  });

  it('arquiva sem alterar o nome', async () => {
    const { categories } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );

    const updated = unwrap(
      await makeUpdateCategory(categories)(created.uid, { archived: true }),
    );

    expect(updated.archived).toBe(true);
    expect(updated.name).toBe('Mercado');
  });

  it('propaga falha de infraestrutura', async () => {
    const { categories } = setup();
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(
      unwrapLeft(await makeUpdateCategory(categories)('uid', { name: 'X' })),
    ).toBe(error);
  });
});

describe('makeDeleteCategory', () => {
  it('exclui categoria sem nenhuma referência', async () => {
    const { categories, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );

    expect(isRight(await deleteCategory(created.uid))).toBe(true);
    expect(unwrap(await categories.list())).toEqual([]);
  });

  it('rejeita quando um lançamento referencia a categoria', async () => {
    const { categories, entries, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    await entries.create(makeEntry(created.uid));

    const error = unwrapLeft(await deleteCategory(created.uid));

    expect(error).toBeInstanceOf(FinanceCategoryInUseError);
    expect(unwrap(await categories.list())).toHaveLength(1);
  });

  it('rejeita quando um item de orçamento referencia a categoria', async () => {
    const { categories, budget, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    await budget.save({ categoryUid: created.uid, month: null, amount: 500 });

    expect(unwrapLeft(await deleteCategory(created.uid))).toBeInstanceOf(
      FinanceCategoryInUseError,
    );
  });

  it('rejeita quando o filtro de uma fórmula referencia a categoria', async () => {
    const { categories, automations, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'PJ', kind: 'income' }),
    );
    await automations.saveFormula(
      makeFormula({
        filter: { kind: 'income', categoryUids: [created.uid], memberUids: [] },
      }),
    );

    expect(unwrapLeft(await deleteCategory(created.uid))).toBeInstanceOf(
      FinanceCategoryInUseError,
    );
  });

  it('rejeita quando a saída de uma fórmula referencia a categoria', async () => {
    const { categories, automations, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Impostos', kind: 'expense' }),
    );
    await automations.saveFormula(
      makeFormula({ outputCategoryUid: created.uid }),
    );

    expect(unwrapLeft(await deleteCategory(created.uid))).toBeInstanceOf(
      FinanceCategoryInUseError,
    );
  });

  it('rejeita quando uma recorrência referencia a categoria', async () => {
    const { categories, automations, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Moradia', kind: 'expense' }),
    );
    await automations.saveRecurrence(makeRecurrence(created.uid));

    expect(unwrapLeft(await deleteCategory(created.uid))).toBeInstanceOf(
      FinanceCategoryInUseError,
    );
  });

  it('rejeita quando um plano parcelado referencia a categoria', async () => {
    const { categories, automations, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Lazer', kind: 'expense' }),
    );
    await automations.createPlan(makePlan(created.uid));

    expect(unwrapLeft(await deleteCategory(created.uid))).toBeInstanceOf(
      FinanceCategoryInUseError,
    );
  });

  it('propaga falha ao contar lançamentos', async () => {
    const { entries, deleteCategory } = setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await deleteCategory('uid'))).toBe(error);
  });

  it('propaga falha ao contar itens de orçamento', async () => {
    const { budget, deleteCategory } = setup();
    const error = new ConnectorError('falha simulada');
    budget.failNext(error);

    expect(unwrapLeft(await deleteCategory('uid'))).toBe(error);
  });

  it('propaga falha ao contar automações', async () => {
    const { automations, deleteCategory } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await deleteCategory('uid'))).toBe(error);
  });

  it('propaga falha ao excluir', async () => {
    const { categories, deleteCategory } = setup();
    const created = unwrap(
      await categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(unwrapLeft(await deleteCategory(created.uid))).toBe(error);
  });
});
