import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import { MonthClosedError } from '../../domain/errors';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type {
  FinanceEntry,
  InstallmentPlan,
  MonthClosing,
  NewFinanceEntry,
  NewFinanceFormula,
  NewInstallmentPlan,
  NewMonthClosing,
  NewRecurrence,
} from '../../domain/finance/finance.entity';
import {
  FakeFinanceAutomationRepository,
  FakeFinanceBudgetRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
  FakeFinanceMemberRepository,
  makeFakeUnitOfWork,
  type FakeFinanceRepository,
} from './fakes';

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const expectFailNextOnEveryMethod = async (
  repo: FakeFinanceRepository,
  calls: (() => Promise<Either<InfrastructureError, unknown>>)[],
) => {
  for (const call of calls) {
    const error = new ConnectorError('falha simulada');
    repo.failNext(error);
    expect(unwrapLeft(await call())).toBe(error);
  }
};

const makeEntry = (
  overrides: Partial<NewFinanceEntry> = {},
): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Mercado da semana',
  amount: 250,
  kind: 'expense',
  categoryUid: 'cat-market',
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
  ...overrides,
});

const makeFormula = (
  overrides: Partial<NewFinanceFormula> = {},
): NewFinanceFormula => ({
  uid: createUid(),
  name: 'DARF PJ',
  percent: 15.5,
  filter: { kind: 'income', categoryUids: [], memberUids: [] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-tax',
  outputDescription: 'DARF',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makeRecurrence = (
  overrides: Partial<NewRecurrence> = {},
): NewRecurrence => ({
  uid: createUid(),
  description: 'Aluguel',
  amount: 1800,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: ['member-me'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makePlan = (
  overrides: Partial<NewInstallmentPlan> = {},
): NewInstallmentPlan => ({
  uid: createUid(),
  description: 'Notebook',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-08',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-tech',
  memberUids: ['member-me'],
  createdAt: 1,
  ...overrides,
});

const makeClosing = (
  overrides: Partial<NewMonthClosing> = {},
): NewMonthClosing => ({
  uid: createUid(),
  month: '2026-06',
  closedAt: 1,
  plannedIncome: 5000,
  plannedExpense: 4000,
  plannedBalance: 1000,
  actualIncome: 5100,
  actualExpense: 3900,
  actualBalance: 1200,
  categories: [
    {
      categoryUid: 'cat-home',
      name: 'Moradia',
      kind: 'expense',
      budgeted: 1800,
      actual: 1800,
    },
  ],
  ...overrides,
});

describe('FakeFinanceMemberRepository', () => {
  it('cria membros com id incremental, uid próprio e archived falso', async () => {
    const repo = new FakeFinanceMemberRepository();
    const ana = unwrap(await repo.create('Ana'));
    const bia = unwrap(await repo.create('Bia'));
    expect(ana.id).toBe(1);
    expect(bia.id).toBe(2);
    expect(ana.uid).not.toBe(bia.uid);
    expect(ana.archived).toBe(false);
    expect(bia.createdAt).toBeGreaterThan(ana.createdAt);
    expect(unwrap(await repo.list())).toEqual([ana, bia]);
  });

  it('update altera nome e arquivamento', async () => {
    const repo = new FakeFinanceMemberRepository();
    const ana = unwrap(await repo.create('Ana'));
    const renamed = unwrap(await repo.update(ana.uid, { name: 'Ana Maria' }));
    expect(renamed.name).toBe('Ana Maria');
    const archived = unwrap(await repo.update(ana.uid, { archived: true }));
    expect(archived.archived).toBe(true);
    expect(unwrap(await repo.list())).toEqual([archived]);
  });

  it('update de uid inexistente retorna RecordNotFoundError', async () => {
    const repo = new FakeFinanceMemberRepository();
    const error = unwrapLeft(await repo.update('missing', { name: 'X' }));
    expect(error.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove o membro e é idempotente', async () => {
    const repo = new FakeFinanceMemberRepository();
    const ana = unwrap(await repo.create('Ana'));
    expect(isRight(await repo.delete(ana.uid))).toBe(true);
    expect(isRight(await repo.delete(ana.uid))).toBe(true);
    expect(unwrap(await repo.list())).toEqual([]);
  });

  it('ensureDefault cria só com a tabela vazia e retorna null depois, mesmo com membro arquivado', async () => {
    const repo = new FakeFinanceMemberRepository();
    const created = unwrap(await repo.ensureDefault('Eu'));
    expect(created?.name).toBe('Eu');
    expect(unwrap(await repo.ensureDefault('Eu'))).toBeNull();
    await repo.update(created?.uid ?? '', { archived: true });
    expect(unwrap(await repo.ensureDefault('Eu'))).toBeNull();
    expect(unwrap(await repo.list())).toHaveLength(1);
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceMemberRepository();
    const ana = unwrap(await repo.create('Ana'));
    await expectFailNextOnEveryMethod(repo, [
      () => repo.list(),
      () => repo.create('Bia'),
      () => repo.update(ana.uid, { name: 'Bia' }),
      () => repo.delete(ana.uid),
      () => repo.ensureDefault('Eu'),
    ]);
  });

  it('failNext afeta apenas a próxima chamada', async () => {
    const repo = new FakeFinanceMemberRepository();
    repo.failNext(new ConnectorError('falha simulada'));
    expect(isLeft(await repo.list())).toBe(true);
    expect(isRight(await repo.list())).toBe(true);
  });
});

describe('FakeFinanceCategoryRepository', () => {
  it('cria categorias com kind e archived falso', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const home = unwrap(
      await repo.create({ name: 'Moradia', kind: 'expense' }),
    );
    const salary = unwrap(
      await repo.create({ name: 'Salário', kind: 'income' }),
    );
    expect(home.id).toBe(1);
    expect(home.kind).toBe('expense');
    expect(salary.kind).toBe('income');
    expect(home.archived).toBe(false);
    expect(salary.createdAt).toBeGreaterThan(home.createdAt);
    expect(unwrap(await repo.list())).toEqual([home, salary]);
  });

  it('update altera nome e arquivamento', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const home = unwrap(
      await repo.create({ name: 'Moradia', kind: 'expense' }),
    );
    const updated = unwrap(
      await repo.update(home.uid, { name: 'Casa', archived: true }),
    );
    expect(updated.name).toBe('Casa');
    expect(updated.archived).toBe(true);
    expect(unwrap(await repo.list())).toEqual([updated]);
  });

  it('update de uid inexistente retorna RecordNotFoundError', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const error = unwrapLeft(await repo.update('missing', { name: 'X' }));
    expect(error.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove a categoria e é idempotente', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const home = unwrap(
      await repo.create({ name: 'Moradia', kind: 'expense' }),
    );
    expect(isRight(await repo.delete(home.uid))).toBe(true);
    expect(isRight(await repo.delete(home.uid))).toBe(true);
    expect(unwrap(await repo.list())).toEqual([]);
  });

  it('ensureDefaults insere todos os padrões só com a tabela vazia', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const created = unwrap(
      await repo.ensureDefaults([
        { name: 'Moradia', kind: 'expense' },
        { name: 'Salário', kind: 'income' },
      ]),
    );
    expect(created?.map((category) => category.name)).toEqual([
      'Moradia',
      'Salário',
    ]);
    expect(
      unwrap(await repo.ensureDefaults([{ name: 'Lazer', kind: 'expense' }])),
    ).toBeNull();
    expect(unwrap(await repo.list())).toHaveLength(2);
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceCategoryRepository();
    const home = unwrap(
      await repo.create({ name: 'Moradia', kind: 'expense' }),
    );
    await expectFailNextOnEveryMethod(repo, [
      () => repo.list(),
      () => repo.create({ name: 'Lazer', kind: 'expense' }),
      () => repo.update(home.uid, { archived: true }),
      () => repo.delete(home.uid),
      () => repo.ensureDefaults([{ name: 'Salário', kind: 'income' }]),
    ]);
  });
});

describe('FakeFinanceEntryRepository', () => {
  it('create atribui id incremental e copia os arrays do input', async () => {
    const repo = new FakeFinanceEntryRepository();
    const input = makeEntry({ memberUids: ['m1'], sourceEntryUids: ['e1'] });
    const created = unwrap(await repo.create(input));
    expect(created.id).toBe(1);
    expect(created.uid).toBe(input.uid);
    input.memberUids.push('m2');
    input.sourceEntryUids.push('e2');
    const stored = unwrap(await repo.findByUid(input.uid));
    expect(stored?.memberUids).toEqual(['m1']);
    expect(stored?.sourceEntryUids).toEqual(['e1']);
  });

  it('createMany cria todas as entries em sequência', async () => {
    const repo = new FakeFinanceEntryRepository();
    const created = unwrap(
      await repo.createMany([makeEntry(), makeEntry(), makeEntry()]),
    );
    expect(created.map((entry) => entry.id)).toEqual([1, 2, 3]);
    expect(unwrap(await repo.list({}))).toHaveLength(3);
  });

  it('list ordena por date, depois createdAt, depois uid', async () => {
    const repo = new FakeFinanceEntryRepository();
    const later = unwrap(await repo.create(makeEntry({ date: 200 })));
    const tieUidB = unwrap(
      await repo.create(makeEntry({ uid: 'uid-b', date: 100, createdAt: 5 })),
    );
    const tieUidA = unwrap(
      await repo.create(makeEntry({ uid: 'uid-a', date: 100, createdAt: 5 })),
    );
    const earliestCreated = unwrap(
      await repo.create(makeEntry({ date: 100, createdAt: 1 })),
    );
    expect(unwrap(await repo.list({}))).toEqual([
      earliestCreated,
      tieUidA,
      tieUidB,
      later,
    ]);
  });

  it('list aplica cada campo do filtro', async () => {
    const repo = new FakeFinanceEntryRepository();
    const target = unwrap(
      await repo.create(
        makeEntry({
          description: 'Parcela do Notebook',
          month: '2026-07',
          status: 'paid',
          kind: 'expense',
          categoryUid: 'cat-tech',
          memberUids: ['m1', 'm2'],
          source: 'installment',
          sourceUid: 'plan-1',
        }),
      ),
    );
    const other = unwrap(
      await repo.create(
        makeEntry({
          description: 'Salário',
          month: '2026-08',
          status: 'pending',
          kind: 'income',
          categoryUid: 'cat-salary',
          memberUids: ['m3'],
          source: 'manual',
          sourceUid: null,
        }),
      ),
    );
    expect(unwrap(await repo.list({ month: '2026-07' }))).toEqual([target]);
    expect(unwrap(await repo.list({ status: 'paid' }))).toEqual([target]);
    expect(unwrap(await repo.list({ kind: 'income' }))).toEqual([other]);
    expect(unwrap(await repo.list({ categoryUid: 'cat-tech' }))).toEqual([
      target,
    ]);
    expect(unwrap(await repo.list({ memberUid: 'm2' }))).toEqual([target]);
    expect(unwrap(await repo.list({ text: 'noteBOOK' }))).toEqual([target]);
    expect(unwrap(await repo.list({ sourceUid: 'plan-1' }))).toEqual([target]);
    expect(unwrap(await repo.list({ source: 'manual' }))).toEqual([other]);
    expect(unwrap(await repo.list({ monthBefore: '2026-08' }))).toEqual([
      target,
    ]);
    expect(
      unwrap(await repo.list({ month: '2026-07', status: 'pending' })),
    ).toEqual([]);
  });

  it('findByUid retorna undefined quando não existe', async () => {
    const repo = new FakeFinanceEntryRepository();
    expect(unwrap(await repo.findByUid('missing'))).toBeUndefined();
  });

  it('update altera campos e recusa uid inexistente', async () => {
    const repo = new FakeFinanceEntryRepository();
    const created = unwrap(await repo.create(makeEntry()));
    const updated = unwrap(
      await repo.update(created.uid, { status: 'paid', amount: 300 }),
    );
    expect(updated.status).toBe('paid');
    expect(updated.amount).toBe(300);
    expect(unwrap(await repo.findByUid(created.uid))).toEqual(updated);
    const error = unwrapLeft(await repo.update('missing', { amount: 1 }));
    expect(error.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove a entry e é idempotente', async () => {
    const repo = new FakeFinanceEntryRepository();
    const created = unwrap(await repo.create(makeEntry()));
    expect(isRight(await repo.delete(created.uid))).toBe(true);
    expect(isRight(await repo.delete(created.uid))).toBe(true);
    expect(unwrap(await repo.list({}))).toEqual([]);
  });

  it('deleteBySource apaga só o status pedido, poupando meses excluídos e outras origens', async () => {
    const repo = new FakeFinanceEntryRepository();
    const keptClosedMonth = unwrap(
      await repo.create(
        makeEntry({ sourceUid: 'plan-1', status: 'pending', month: '2026-01' }),
      ),
    );
    unwrap(
      await repo.create(
        makeEntry({ sourceUid: 'plan-1', status: 'pending', month: '2026-02' }),
      ),
    );
    const keptPaid = unwrap(
      await repo.create(
        makeEntry({ sourceUid: 'plan-1', status: 'paid', month: '2026-03' }),
      ),
    );
    const keptOtherSource = unwrap(
      await repo.create(
        makeEntry({ sourceUid: 'plan-2', status: 'pending', month: '2026-02' }),
      ),
    );
    const removed = unwrap(
      await repo.deleteBySource('plan-1', 'pending', ['2026-01']),
    );
    expect(removed).toBe(1);
    const remaining = unwrap(await repo.list({}));
    expect(remaining.map((entry) => entry.uid).sort()).toEqual(
      [keptClosedMonth.uid, keptPaid.uid, keptOtherSource.uid].sort(),
    );
  });

  it('listPaid retorna só entries pagas', async () => {
    const repo = new FakeFinanceEntryRepository();
    const paid = unwrap(await repo.create(makeEntry({ status: 'paid' })));
    unwrap(await repo.create(makeEntry({ status: 'pending' })));
    expect(unwrap(await repo.listPaid())).toEqual([paid]);
  });

  it('countByCategory e countByMember contam referências', async () => {
    const repo = new FakeFinanceEntryRepository();
    await repo.create(makeEntry({ categoryUid: 'cat-1', memberUids: ['m1'] }));
    await repo.create(
      makeEntry({ categoryUid: 'cat-1', memberUids: ['m1', 'm2'] }),
    );
    await repo.create(makeEntry({ categoryUid: 'cat-2', memberUids: ['m2'] }));
    expect(unwrap(await repo.countByCategory('cat-1'))).toBe(2);
    expect(unwrap(await repo.countByCategory('cat-x'))).toBe(0);
    expect(unwrap(await repo.countByMember('m1'))).toBe(2);
    expect(unwrap(await repo.countByMember('m3'))).toBe(0);
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceEntryRepository();
    const created = unwrap(await repo.create(makeEntry()));
    await expectFailNextOnEveryMethod(repo, [
      () => repo.list({}),
      () => repo.findByUid(created.uid),
      () => repo.create(makeEntry()),
      () => repo.createMany([makeEntry()]),
      () => repo.update(created.uid, { amount: 10 }),
      () => repo.delete(created.uid),
      () => repo.deleteBySource('plan-1', 'pending', []),
      () => repo.listPaid(),
      () => repo.countByCategory('cat-1'),
      () => repo.countByMember('m1'),
    ]);
  });
});

describe('FakeFinanceBudgetRepository', () => {
  it('save cria item novo com uid e timestamps', async () => {
    const repo = new FakeFinanceBudgetRepository();
    const created = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: null, amount: 500 }),
    );
    expect(created.id).toBe(1);
    expect(created.uid).toBeTruthy();
    expect(created.month).toBeNull();
    expect(created.amount).toBe(500);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(unwrap(await repo.listAll())).toEqual([created]);
  });

  it('save upserta por categoryUid+month preservando uid e createdAt', async () => {
    const repo = new FakeFinanceBudgetRepository();
    const created = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: '2026-07', amount: 500 }),
    );
    const updated = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: '2026-07', amount: 800 }),
    );
    expect(updated.uid).toBe(created.uid);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.amount).toBe(800);
    expect(updated.updatedAt).toBeGreaterThan(created.updatedAt);
    expect(unwrap(await repo.listAll())).toHaveLength(1);
  });

  it('save trata modelo e override do mês como itens distintos', async () => {
    const repo = new FakeFinanceBudgetRepository();
    const template = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: null, amount: 500 }),
    );
    const override = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: '2026-07', amount: 0 }),
    );
    expect(template.uid).not.toBe(override.uid);
    expect(unwrap(await repo.listAll())).toHaveLength(2);
    expect(unwrap(await repo.countByCategory('cat-1'))).toBe(2);
    expect(unwrap(await repo.countByCategory('cat-2'))).toBe(0);
  });

  it('remove apaga o item e é idempotente', async () => {
    const repo = new FakeFinanceBudgetRepository();
    const created = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: null, amount: 500 }),
    );
    expect(isRight(await repo.remove(created.uid))).toBe(true);
    expect(isRight(await repo.remove(created.uid))).toBe(true);
    expect(unwrap(await repo.listAll())).toEqual([]);
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceBudgetRepository();
    const created = unwrap(
      await repo.save({ categoryUid: 'cat-1', month: null, amount: 500 }),
    );
    await expectFailNextOnEveryMethod(repo, [
      () => repo.listAll(),
      () => repo.save({ categoryUid: 'cat-2', month: null, amount: 100 }),
      () => repo.remove(created.uid),
      () => repo.countByCategory('cat-1'),
    ]);
  });
});

describe('FakeFinanceAutomationRepository', () => {
  it('saveFormula cria com id e atualiza pelo uid preservando o id', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const created = unwrap(await repo.saveFormula(makeFormula()));
    expect(created.id).toBe(1);
    const updated = unwrap(await repo.saveFormula({ ...created, percent: 20 }));
    expect(updated.id).toBe(1);
    expect(updated.percent).toBe(20);
    expect(unwrap(await repo.listFormulas())).toEqual([updated]);
  });

  it('deleteFormula remove e é idempotente', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const created = unwrap(await repo.saveFormula(makeFormula()));
    expect(isRight(await repo.deleteFormula(created.uid))).toBe(true);
    expect(isRight(await repo.deleteFormula(created.uid))).toBe(true);
    expect(unwrap(await repo.listFormulas())).toEqual([]);
  });

  it('saveRecurrence cria com id e atualiza pelo uid preservando o id', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const created = unwrap(await repo.saveRecurrence(makeRecurrence()));
    expect(created.id).toBe(1);
    const updated = unwrap(
      await repo.saveRecurrence({ ...created, active: false }),
    );
    expect(updated.id).toBe(1);
    expect(updated.active).toBe(false);
    expect(unwrap(await repo.listRecurrences())).toEqual([updated]);
  });

  it('deleteRecurrence remove e é idempotente', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const created = unwrap(await repo.saveRecurrence(makeRecurrence()));
    expect(isRight(await repo.deleteRecurrence(created.uid))).toBe(true);
    expect(isRight(await repo.deleteRecurrence(created.uid))).toBe(true);
    expect(unwrap(await repo.listRecurrences())).toEqual([]);
  });

  it('createPlan atribui id e copia memberUids; deletePlan é idempotente', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const input = makePlan({ memberUids: ['m1'] });
    const created = unwrap(await repo.createPlan(input));
    expect(created.id).toBe(1);
    input.memberUids.push('m2');
    expect(unwrap(await repo.listPlans())).toEqual([
      { ...created, memberUids: ['m1'] },
    ]);
    expect(isRight(await repo.deletePlan(created.uid))).toBe(true);
    expect(isRight(await repo.deletePlan(created.uid))).toBe(true);
    expect(unwrap(await repo.listPlans())).toEqual([]);
  });

  it('countCategoryRefs soma fórmulas (filtro e saída, sem contar duas vezes), recorrências e planos', async () => {
    const repo = new FakeFinanceAutomationRepository();
    await repo.saveFormula(
      makeFormula({
        filter: { kind: 'income', categoryUids: ['cat-1'], memberUids: [] },
        outputCategoryUid: 'cat-other',
      }),
    );
    await repo.saveFormula(
      makeFormula({
        filter: { kind: 'income', categoryUids: [], memberUids: [] },
        outputCategoryUid: 'cat-1',
      }),
    );
    await repo.saveFormula(
      makeFormula({
        filter: { kind: 'income', categoryUids: ['cat-1'], memberUids: [] },
        outputCategoryUid: 'cat-1',
      }),
    );
    await repo.saveRecurrence(makeRecurrence({ categoryUid: 'cat-1' }));
    await repo.saveRecurrence(makeRecurrence({ categoryUid: 'cat-other' }));
    await repo.createPlan(makePlan({ categoryUid: 'cat-1' }));
    expect(unwrap(await repo.countCategoryRefs('cat-1'))).toBe(5);
    expect(unwrap(await repo.countCategoryRefs('cat-none'))).toBe(0);
  });

  it('countMemberRefs soma fórmulas, recorrências e planos', async () => {
    const repo = new FakeFinanceAutomationRepository();
    await repo.saveFormula(
      makeFormula({
        filter: { kind: 'income', categoryUids: [], memberUids: ['m1'] },
      }),
    );
    await repo.saveRecurrence(makeRecurrence({ memberUids: ['m1', 'm2'] }));
    await repo.createPlan(makePlan({ memberUids: ['m2'] }));
    expect(unwrap(await repo.countMemberRefs('m1'))).toBe(2);
    expect(unwrap(await repo.countMemberRefs('m2'))).toBe(2);
    expect(unwrap(await repo.countMemberRefs('m3'))).toBe(0);
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceAutomationRepository();
    const formula = unwrap(await repo.saveFormula(makeFormula()));
    const recurrence = unwrap(await repo.saveRecurrence(makeRecurrence()));
    const plan = unwrap(await repo.createPlan(makePlan()));
    await expectFailNextOnEveryMethod(repo, [
      () => repo.listFormulas(),
      () => repo.saveFormula(makeFormula()),
      () => repo.deleteFormula(formula.uid),
      () => repo.listRecurrences(),
      () => repo.saveRecurrence(makeRecurrence()),
      () => repo.deleteRecurrence(recurrence.uid),
      () => repo.listPlans(),
      () => repo.createPlan(makePlan()),
      () => repo.deletePlan(plan.uid),
      () => repo.countCategoryRefs('cat-1'),
      () => repo.countMemberRefs('m1'),
    ]);
  });
});

describe('FakeFinanceClosingRepository', () => {
  it('create atribui id, copia categories e findByMonth localiza', async () => {
    const repo = new FakeFinanceClosingRepository();
    const input = makeClosing({ month: '2026-06' });
    const created = unwrap(await repo.create(input));
    expect(created.id).toBe(1);
    input.categories.push({
      categoryUid: 'cat-x',
      name: 'Extra',
      kind: 'expense',
      budgeted: 0,
      actual: 0,
    });
    const found = unwrap(await repo.findByMonth('2026-06'));
    expect(found?.categories).toHaveLength(1);
    expect(unwrap(await repo.findByMonth('2026-01'))).toBeUndefined();
  });

  it('create rejeita mês duplicado com UniqueConstraintError', async () => {
    const repo = new FakeFinanceClosingRepository();
    unwrap(await repo.create(makeClosing({ month: '2026-06' })));
    const error = unwrapLeft(
      await repo.create(makeClosing({ month: '2026-06' })),
    );
    expect(error.code).toBe('UNIQUE_CONSTRAINT');
  });

  it('list e listClosedMonths retornam ordenados por mês', async () => {
    const repo = new FakeFinanceClosingRepository();
    const july = unwrap(await repo.create(makeClosing({ month: '2026-07' })));
    const may = unwrap(await repo.create(makeClosing({ month: '2026-05' })));
    expect(unwrap(await repo.list())).toEqual([may, july]);
    expect(unwrap(await repo.listClosedMonths())).toEqual([
      '2026-05',
      '2026-07',
    ]);
  });

  it('deleteByMonth remove, é idempotente e libera o mês para novo fechamento', async () => {
    const repo = new FakeFinanceClosingRepository();
    unwrap(await repo.create(makeClosing({ month: '2026-06' })));
    expect(isRight(await repo.deleteByMonth('2026-06'))).toBe(true);
    expect(isRight(await repo.deleteByMonth('2026-06'))).toBe(true);
    expect(unwrap(await repo.list())).toEqual([]);
    expect(isRight(await repo.create(makeClosing({ month: '2026-06' })))).toBe(
      true,
    );
  });

  it('failNext faz o próximo método retornar o erro injetado', async () => {
    const repo = new FakeFinanceClosingRepository();
    await expectFailNextOnEveryMethod(repo, [
      () => repo.list(),
      () => repo.findByMonth('2026-06'),
      () => repo.listClosedMonths(),
      () => repo.create(makeClosing()),
      () => repo.deleteByMonth('2026-06'),
    ]);
  });
});

describe('makeFakeUnitOfWork', () => {
  it('entrega os próprios fakes ao work e mantém as escritas quando o work retorna Right', async () => {
    const entries = new FakeFinanceEntryRepository();
    const uow = makeFakeUnitOfWork({ financeEntries: entries });
    const result = await uow.run(async (repositories) => {
      expect(
        (repositories as unknown as Record<string, unknown>).financeEntries,
      ).toBe(entries);
      const created = await entries.create(makeEntry());
      return created;
    });
    expect(isRight(result)).toBe(true);
    expect(unwrap(await entries.list({}))).toHaveLength(1);
  });

  it('restaura o estado de todos os fakes quando o work retorna Left', async () => {
    const entries = new FakeFinanceEntryRepository();
    const automations = new FakeFinanceAutomationRepository();
    const closings = new FakeFinanceClosingRepository();
    const existingEntry = unwrap(await entries.create(makeEntry()));
    const existingPlan = unwrap(await automations.createPlan(makePlan()));
    const uow = makeFakeUnitOfWork({
      financeEntries: entries,
      financeAutomations: automations,
      financeClosings: closings,
    });
    const failure = new MonthClosedError('2026-07');
    const result = await uow.run(async () => {
      await entries.createMany([makeEntry(), makeEntry()]);
      await entries.delete(existingEntry.uid);
      await automations.deletePlan(existingPlan.uid);
      await closings.create(makeClosing());
      return left(failure);
    });
    expect(unwrapLeft(result)).toBe(failure);
    expect(unwrap(await entries.list({}))).toEqual([existingEntry]);
    expect(unwrap(await automations.listPlans())).toEqual([existingPlan]);
    expect(unwrap(await closings.list())).toEqual([]);
  });

  it('restaura membros, categorias e orçamento quando o work retorna Left', async () => {
    const members = new FakeFinanceMemberRepository();
    const categories = new FakeFinanceCategoryRepository();
    const budget = new FakeFinanceBudgetRepository();
    const existingMember = unwrap(await members.create('Ana'));
    const existingCategory = unwrap(
      await categories.create({ name: 'Moradia', kind: 'expense' }),
    );
    const existingItem = unwrap(
      await budget.save({
        categoryUid: existingCategory.uid,
        month: null,
        amount: 500,
      }),
    );
    const uow = makeFakeUnitOfWork({
      financeMembers: members,
      financeCategories: categories,
      financeBudget: budget,
    });
    const failure = new MonthClosedError('2026-07');
    const result = await uow.run(async () => {
      await members.delete(existingMember.uid);
      await categories.create({ name: 'Lazer', kind: 'expense' });
      await budget.remove(existingItem.uid);
      return left(failure);
    });
    expect(unwrapLeft(result)).toBe(failure);
    expect(unwrap(await members.list())).toEqual([existingMember]);
    expect(unwrap(await categories.list())).toEqual([existingCategory]);
    expect(unwrap(await budget.listAll())).toEqual([existingItem]);
  });
});

describe('tipos auxiliares dos fakes', () => {
  it('entidades expostas pelos fakes casam com os tipos do domínio', async () => {
    const entries = new FakeFinanceEntryRepository();
    const entry: FinanceEntry = unwrap(await entries.create(makeEntry()));
    expect(entry.uid).toBeTruthy();
    const closings = new FakeFinanceClosingRepository();
    const closing: MonthClosing = unwrap(await closings.create(makeClosing()));
    expect(closing.uid).toBeTruthy();
    const automations = new FakeFinanceAutomationRepository();
    const plan: InstallmentPlan = unwrap(
      await automations.createPlan(makePlan()),
    );
    expect(plan.uid).toBeTruthy();
  });
});
