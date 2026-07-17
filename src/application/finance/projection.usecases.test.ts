import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type {
  MonthKey,
  NewFinanceEntry,
  NewMonthClosing,
  NewRecurrence,
} from '../../domain/finance/finance.entity';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import {
  FakeFinanceAutomationRepository,
  FakeFinanceBudgetRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
} from './fakes';
import { makeLoadProjection, sumPaidBalance } from './projection.usecases';

const nowMs = new Date(2026, 6, 15, 12).getTime();

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const makeEntry = (
  overrides: Partial<NewFinanceEntry> = {},
): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Mercado da semana',
  amount: 100,
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

const makeRecurrence = (
  overrides: Partial<NewRecurrence> = {},
): NewRecurrence => ({
  uid: createUid(),
  description: 'Assinatura',
  amount: 80,
  kind: 'expense',
  categoryUid: 'cat-market',
  memberUids: ['member-me'],
  dayOfMonth: 10,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makeClosing = (month: MonthKey): NewMonthClosing => ({
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

const entriesFailingAt = (
  repo: FinanceEntryRepository,
  failAt: number,
  error: InfrastructureError,
): FinanceEntryRepository => {
  let calls = 0;
  const guard = async <A>(
    run: () => Promise<Either<InfrastructureError, A>>,
  ): Promise<Either<InfrastructureError, A>> => {
    calls += 1;
    if (calls === failAt) return left(error);
    return run();
  };
  return {
    list: (filter) => guard(() => repo.list(filter)),
    findByUid: (uid) => guard(() => repo.findByUid(uid)),
    create: (entry) => guard(() => repo.create(entry)),
    createMany: (list) => guard(() => repo.createMany(list)),
    update: (uid, changes) => guard(() => repo.update(uid, changes)),
    delete: (uid) => guard(() => repo.delete(uid)),
    deleteBySource: (sourceUid, onlyStatus, excludeMonths) =>
      guard(() => repo.deleteBySource(sourceUid, onlyStatus, excludeMonths)),
    listPaid: () => guard(() => repo.listPaid()),
    countByCategory: (categoryUid) =>
      guard(() => repo.countByCategory(categoryUid)),
    countByMember: (memberUid) => guard(() => repo.countByMember(memberUid)),
  };
};

const makeRepos = () => ({
  entries: new FakeFinanceEntryRepository(),
  budget: new FakeFinanceBudgetRepository(),
  categories: new FakeFinanceCategoryRepository(),
  automations: new FakeFinanceAutomationRepository(),
  closings: new FakeFinanceClosingRepository(),
});

const makeUseCase = (repos: ReturnType<typeof makeRepos>) =>
  makeLoadProjection(
    repos.entries,
    repos.budget,
    repos.categories,
    repos.automations,
    repos.closings,
  );

describe('sumPaidBalance', () => {
  it('soma receitas e subtrai despesas com round2', () => {
    const balance = sumPaidBalance([
      { ...makeEntry({ kind: 'income', amount: 10.105 }), id: 1 },
      { ...makeEntry({ kind: 'expense', amount: 3.1 }), id: 2 },
    ]);
    expect(balance).toBe(7.01);
  });
});

describe('makeLoadProjection', () => {
  it.each([0, 25, 2.5, -1])(
    'rejeita quantidade de meses inválida (%s)',
    async (months) => {
      const repos = makeRepos();
      const loadProjection = makeUseCase(repos);
      const result = await loadProjection({ months, source: 'entries', nowMs });
      expect(unwrapLeft(result).code).toBe('finance/invalid-month');
    },
  );

  it('usa a soma dos lançamentos pagos de todos os tempos como saldo inicial', async () => {
    const repos = makeRepos();
    await repos.entries.create(
      makeEntry({
        kind: 'income',
        amount: 1000,
        month: '2026-05',
        status: 'paid',
      }),
    );
    await repos.entries.create(
      makeEntry({
        kind: 'expense',
        amount: 200,
        month: '2026-06',
        status: 'paid',
      }),
    );
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 1, source: 'entries', nowMs }),
    );
    expect(points).toEqual([
      {
        month: '2026-07',
        plannedIncome: 0,
        plannedExpense: 0,
        delta: 0,
        balance: 800,
      },
    ]);
  });

  it('inclui atrasados de meses fechados e abertos no ponto inicial', async () => {
    const repos = makeRepos();
    await repos.closings.create(makeClosing('2026-06'));
    await repos.entries.create(makeEntry({ amount: 100, month: '2026-05' }));
    await repos.entries.create(makeEntry({ amount: 50, month: '2026-06' }));
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 1, source: 'entries', nowMs }),
    );
    expect(points[0].plannedExpense).toBe(150);
    expect(points[0].balance).toBe(-150);
  });

  it('agrupa pendentes por mês apenas dentro do intervalo projetado', async () => {
    const repos = makeRepos();
    await repos.entries.create(makeEntry({ amount: 50, month: '2026-07' }));
    await repos.entries.create(
      makeEntry({ kind: 'income', amount: 30, month: '2026-08' }),
    );
    await repos.entries.create(makeEntry({ amount: 70, month: '2026-10' }));
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 3, source: 'entries', nowMs }),
    );
    expect(points.map((point) => point.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(points.map((point) => point.delta)).toEqual([-50, 30, 0]);
    expect(points[2].balance).toBe(-20);
  });

  it('resolve o orçamento por mês e desconta pagos do mês atual na fonte budget', async () => {
    const repos = makeRepos();
    const category = unwrap(
      await repos.categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    await repos.budget.save({
      categoryUid: category.uid,
      month: null,
      amount: 500,
    });
    await repos.budget.save({
      categoryUid: category.uid,
      month: '2026-08',
      amount: 300,
    });
    await repos.entries.create(
      makeEntry({
        amount: 200,
        month: '2026-07',
        status: 'paid',
        categoryUid: category.uid,
      }),
    );
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 2, source: 'budget', nowMs }),
    );
    expect(points[0]).toMatchObject({
      month: '2026-07',
      plannedExpense: 300,
      balance: -500,
    });
    expect(points[1]).toMatchObject({
      month: '2026-08',
      plannedExpense: 300,
      balance: -800,
    });
  });

  it('não conta em dobro parcela futura já paga na fonte budget', async () => {
    const repos = makeRepos();
    const category = unwrap(
      await repos.categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    await repos.budget.save({
      categoryUid: category.uid,
      month: null,
      amount: 500,
    });
    await repos.entries.create(
      makeEntry({
        amount: 200,
        month: '2026-08',
        status: 'paid',
        categoryUid: category.uid,
      }),
    );
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 2, source: 'budget', nowMs }),
    );
    expect(points[0]).toMatchObject({
      month: '2026-07',
      plannedExpense: 500,
      balance: -700,
    });
    expect(points[1]).toMatchObject({
      month: '2026-08',
      plannedExpense: 300,
      balance: -1000,
    });
  });

  it('suprime recorrências virtuais quando o mês atual está fechado', async () => {
    const repos = makeRepos();
    await repos.closings.create(makeClosing('2026-07'));
    await repos.automations.saveRecurrence(makeRecurrence({ amount: 80 }));
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 2, source: 'entries', nowMs }),
    );
    expect(points.map((point) => point.plannedExpense)).toEqual([0, 80]);
  });

  it('não conta em dobro recorrência já lançada e projeta o virtual nos meses seguintes', async () => {
    const repos = makeRepos();
    const recurrence = unwrap(
      await repos.automations.saveRecurrence(makeRecurrence({ amount: 80 })),
    );
    await repos.entries.create(
      makeEntry({
        amount: 80,
        month: '2026-07',
        source: 'recurrence',
        sourceUid: recurrence.uid,
      }),
    );
    const loadProjection = makeUseCase(repos);
    const points = unwrap(
      await loadProjection({ months: 2, source: 'entries', nowMs }),
    );
    expect(points.map((point) => point.delta)).toEqual([-80, -80]);
    expect(points[1].balance).toBe(-160);
  });

  it('propaga falha de cada repositório', async () => {
    const repos = makeRepos();
    const loadProjection = makeUseCase(repos);
    const run = () => loadProjection({ months: 2, source: 'both', nowMs });
    for (const repo of [
      repos.entries,
      repos.budget,
      repos.categories,
      repos.automations,
      repos.closings,
    ]) {
      const error = new ConnectorError('falha simulada');
      repo.failNext(error);
      expect(unwrapLeft(await run())).toBe(error);
    }
  });

  it('propaga falha em cada consulta de lançamentos', async () => {
    for (const failAt of [2, 3, 4]) {
      const repos = makeRepos();
      const error = new ConnectorError('falha simulada');
      const loadProjection = makeLoadProjection(
        entriesFailingAt(repos.entries, failAt, error),
        repos.budget,
        repos.categories,
        repos.automations,
        repos.closings,
      );
      const result = await loadProjection({
        months: 1,
        source: 'entries',
        nowMs,
      });
      expect(unwrapLeft(result)).toBe(error);
    }
  });
});
