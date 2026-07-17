import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight, left } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import type {
  NewFinanceEntry,
  NewInstallmentPlan,
  NewMonthClosing,
} from '../../domain/finance/finance.entity';
import { PDVDatabase } from './dexie-database';
import { DexieUnitOfWork } from './dexie-unit-of-work';
import { ConnectorError } from '../errors';

let db: PDVDatabase;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  db = new PDVDatabase();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

const newEntry = (over: Partial<NewFinanceEntry> = {}): NewFinanceEntry => ({
  uid: createUid(),
  description: 'Parcela',
  amount: 100,
  kind: 'expense',
  categoryUid: 'cat-1',
  memberUids: [],
  date: 1,
  month: '2026-07',
  status: 'pending',
  source: 'installment',
  sourceUid: 'plan-1',
  installmentNumber: 1,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const newPlan = (
  over: Partial<NewInstallmentPlan> = {},
): NewInstallmentPlan => ({
  uid: createUid(),
  description: 'Notebook',
  totalAmount: 1200,
  installmentCount: 12,
  firstMonth: '2026-07',
  dayOfMonth: 5,
  kind: 'expense',
  categoryUid: 'cat-1',
  memberUids: [],
  createdAt: 1,
  ...over,
});

const newClosing = (over: Partial<NewMonthClosing> = {}): NewMonthClosing => ({
  uid: createUid(),
  month: '2026-06',
  closedAt: 1,
  plannedIncome: 0,
  plannedExpense: 0,
  plannedBalance: 0,
  actualIncome: 0,
  actualExpense: 0,
  actualBalance: 0,
  categories: [],
  ...over,
});

describe('DexieUnitOfWork finance tables', () => {
  it('rolls back plan and entries when the work returns a Left', async () => {
    const uow = new DexieUnitOfWork(db);
    const seedPlan = await uow.run((repos) =>
      repos.financeAutomations.createPlan(newPlan({ uid: 'plan-0' })),
    );
    expect(isRight(seedPlan)).toBe(true);
    const seedEntry = await uow.run((repos) =>
      repos.financeEntries.create(newEntry({ sourceUid: 'plan-0' })),
    );
    expect(isRight(seedEntry)).toBe(true);

    const result = await uow.run(async (repos) => {
      const plan = await repos.financeAutomations.createPlan(newPlan());
      if (isLeft(plan)) return plan;
      const entries = await repos.financeEntries.createMany([
        newEntry({ sourceUid: plan.right.uid, installmentNumber: 1 }),
        newEntry({ sourceUid: plan.right.uid, installmentNumber: 2 }),
      ]);
      if (isLeft(entries)) return entries;
      return left(new ConnectorError('boom'));
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(ConnectorError);
    expect(await db.financeInstallmentPlans.count()).toBe(1);
    expect(await db.financeEntries.count()).toBe(1);
  });

  it('persists writes to plans, entries and closings when the work succeeds', async () => {
    const uow = new DexieUnitOfWork(db);
    const result = await uow.run(async (repos) => {
      const plan = await repos.financeAutomations.createPlan(newPlan());
      if (isLeft(plan)) return plan;
      const entries = await repos.financeEntries.createMany([
        newEntry({ sourceUid: plan.right.uid, installmentNumber: 1 }),
        newEntry({ sourceUid: plan.right.uid, installmentNumber: 2 }),
      ]);
      if (isLeft(entries)) return entries;
      return repos.financeClosings.create(newClosing());
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.month).toBe('2026-06');
    expect(await db.financeInstallmentPlans.count()).toBe(1);
    expect(await db.financeEntries.count()).toBe(2);
    expect(await db.financeClosings.count()).toBe(1);
  });
});
