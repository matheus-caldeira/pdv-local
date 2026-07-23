import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type { NewFinanceEntry } from '../../domain/finance/finance.entity';
import type { FinanceEntryRepository } from '../../domain/finance/finance-entry.repository';
import {
  FakeFinanceBudgetRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceEntryRepository,
  FakeFinanceMemberRepository,
} from './fakes';
import { makeLoadFinanceDashboard } from './dashboard.usecases';

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
  paymentMethodUid: null,
  invoiceMonth: null,
  invoiceUid: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
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
  members: new FakeFinanceMemberRepository(),
});

const makeUseCase = (repos: ReturnType<typeof makeRepos>) =>
  makeLoadFinanceDashboard(
    repos.entries,
    repos.budget,
    repos.categories,
    repos.members,
  );

describe('makeLoadFinanceDashboard', () => {
  it('monta saldo, resumo, atrasadas e envolvimento por membro', async () => {
    const repos = makeRepos();
    const ana = unwrap(await repos.members.create('Ana'));
    const bia = unwrap(await repos.members.create('Bia'));
    const caio = unwrap(await repos.members.create('Caio'));
    const market = unwrap(
      await repos.categories.create({ name: 'Mercado', kind: 'expense' }),
    );
    const salary = unwrap(
      await repos.categories.create({ name: 'Salário', kind: 'income' }),
    );
    await repos.budget.save({
      categoryUid: market.uid,
      month: null,
      amount: 400,
    });
    await repos.entries.create(
      makeEntry({
        kind: 'income',
        amount: 1000,
        month: '2026-06',
        status: 'paid',
        categoryUid: salary.uid,
        memberUids: [ana.uid],
      }),
    );
    await repos.entries.create(
      makeEntry({
        amount: 100,
        status: 'paid',
        categoryUid: market.uid,
        memberUids: [ana.uid],
      }),
    );
    await repos.entries.create(
      makeEntry({
        amount: 50,
        categoryUid: market.uid,
        memberUids: [ana.uid, bia.uid],
      }),
    );
    await repos.entries.create(
      makeEntry({
        amount: 30,
        month: '2026-05',
        date: 50,
        categoryUid: market.uid,
        memberUids: [ana.uid],
      }),
    );
    await repos.entries.create(
      makeEntry({
        amount: 20,
        month: '2026-06',
        date: 60,
        categoryUid: market.uid,
        memberUids: [ana.uid],
      }),
    );
    const loadDashboard = makeUseCase(repos);
    const dashboard = unwrap(await loadDashboard('2026-07', nowMs));
    expect(dashboard.currentBalance).toBe(900);
    expect(dashboard.summary).toMatchObject({
      plannedIncome: 0,
      plannedExpense: 400,
      plannedBalance: -400,
      actualIncome: 0,
      actualExpense: 150,
      actualBalance: -150,
    });
    expect(
      dashboard.summary.categories.find(
        (line) => line.categoryUid === market.uid,
      ),
    ).toMatchObject({ budgeted: 400, actual: 150 });
    expect(dashboard.overdueEntries.map((entry) => entry.amount)).toEqual([
      30, 20,
    ]);
    expect(dashboard.overdueExpenseTotal).toBe(50);
    expect(dashboard.overdueIncomeTotal).toBe(0);
    expect(dashboard.pendingThisMonth.map((entry) => entry.amount)).toEqual([
      50,
    ]);
    expect(dashboard.memberInvolvement).toEqual([
      { memberUid: ana.uid, name: 'Ana', total: 150, percent: 100 },
      { memberUid: bia.uid, name: 'Bia', total: 50, percent: 33.33 },
      { memberUid: caio.uid, name: 'Caio', total: 0, percent: 0 },
    ]);
  });

  it('ordena as contas a pagar do mês por data', async () => {
    const repos = makeRepos();
    await repos.entries.create(makeEntry({ amount: 3, date: 300 }));
    await repos.entries.create(makeEntry({ amount: 1, date: 100 }));
    await repos.entries.create(makeEntry({ amount: 2, date: 200 }));
    const loadDashboard = makeUseCase(repos);
    const dashboard = unwrap(await loadDashboard('2026-07', nowMs));
    expect(dashboard.pendingThisMonth.map((entry) => entry.amount)).toEqual([
      1, 2, 3,
    ]);
  });

  it('zera envolvimento quando o mês não tem despesas', async () => {
    const repos = makeRepos();
    const ana = unwrap(await repos.members.create('Ana'));
    await repos.entries.create(
      makeEntry({
        kind: 'income',
        amount: 500,
        status: 'paid',
        memberUids: [ana.uid],
      }),
    );
    const loadDashboard = makeUseCase(repos);
    const dashboard = unwrap(await loadDashboard('2026-07', nowMs));
    expect(dashboard.memberInvolvement).toEqual([
      { memberUid: ana.uid, name: 'Ana', total: 0, percent: 0 },
    ]);
    expect(dashboard.overdueEntries).toEqual([]);
    expect(dashboard.overdueExpenseTotal).toBe(0);
    expect(dashboard.overdueIncomeTotal).toBe(0);
  });

  it('separa os totais de atrasadas por tipo', async () => {
    const repos = makeRepos();
    await repos.entries.create(makeEntry({ amount: 10.006, month: '2026-06' }));
    await repos.entries.create(makeEntry({ amount: 10.007, month: '2026-05' }));
    await repos.entries.create(
      makeEntry({ kind: 'income', amount: 45.5, month: '2026-06' }),
    );
    const loadDashboard = makeUseCase(repos);
    const dashboard = unwrap(await loadDashboard('2026-07', nowMs));
    expect(dashboard.overdueExpenseTotal).toBe(20.01);
    expect(dashboard.overdueIncomeTotal).toBe(45.5);
  });

  it('calcula atrasadas pelo mês corrente do relógio, não pelo mês exibido', async () => {
    const repos = makeRepos();
    await repos.entries.create(makeEntry({ amount: 10, month: '2026-06' }));
    await repos.entries.create(makeEntry({ amount: 20, month: '2026-07' }));
    await repos.entries.create(makeEntry({ amount: 30, month: '2026-08' }));
    const loadDashboard = makeUseCase(repos);
    const dashboard = unwrap(await loadDashboard('2026-08', nowMs));
    expect(dashboard.overdueEntries.map((entry) => entry.amount)).toEqual([10]);
    expect(dashboard.pendingThisMonth.map((entry) => entry.amount)).toEqual([
      30,
    ]);
  });

  it('propaga falha de cada repositório', async () => {
    const repos = makeRepos();
    const loadDashboard = makeUseCase(repos);
    const run = () => loadDashboard('2026-07', nowMs);
    for (const repo of [
      repos.entries,
      repos.budget,
      repos.categories,
      repos.members,
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
      const loadDashboard = makeLoadFinanceDashboard(
        entriesFailingAt(repos.entries, failAt, error),
        repos.budget,
        repos.categories,
        repos.members,
      );
      expect(unwrapLeft(await loadDashboard('2026-07', nowMs))).toBe(error);
    }
  });
});
