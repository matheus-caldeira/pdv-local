import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceClosingRepository } from './dexie-finance-closing.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type { NewMonthClosing } from '../../../domain/finance/finance.entity';

function buildClosing(
  overrides: Partial<NewMonthClosing> = {},
): NewMonthClosing {
  return {
    uid: createUid(),
    month: '2026-06',
    closedAt: 1,
    plannedIncome: 5000,
    plannedExpense: 4000,
    plannedBalance: 1000,
    actualIncome: 5200,
    actualExpense: 3900,
    actualBalance: 1300,
    categories: [
      {
        categoryUid: 'cat-1',
        name: 'Mercado',
        kind: 'expense',
        budgeted: 800,
        actual: 750,
      },
    ],
    ...overrides,
  };
}

describe('DexieFinanceClosingRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceClosingRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceClosingRepository(db);
  });

  it('create persiste o snapshot e retorna com id', async () => {
    const result = await repo.create(buildClosing());
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.id).toBeTruthy();
    expect(result.right.categories).toHaveLength(1);
  });

  it('create de mês já fechado viola a unicidade e retorna UNIQUE_CONSTRAINT', async () => {
    await repo.create(buildClosing({ month: '2026-06' }));
    const result = await repo.create(buildClosing({ month: '2026-06' }));
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('UNIQUE_CONSTRAINT');
  });

  it('list ordena por mês decrescente', async () => {
    await repo.create(buildClosing({ month: '2026-05' }));
    await repo.create(buildClosing({ month: '2026-07' }));
    await repo.create(buildClosing({ month: '2026-06' }));
    const result = await repo.list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((closing) => closing.month)).toEqual([
      '2026-07',
      '2026-06',
      '2026-05',
    ]);
  });

  it('findByMonth encontra o fechamento e retorna undefined quando aberto', async () => {
    await repo.create(buildClosing({ month: '2026-06' }));
    const found = await repo.findByMonth('2026-06');
    expect(isRight(found)).toBe(true);
    if (!isRight(found)) return;
    expect(found.right?.month).toBe('2026-06');
    const missing = await repo.findByMonth('2026-07');
    expect(isRight(missing)).toBe(true);
    if (!isRight(missing)) return;
    expect(missing.right).toBeUndefined();
  });

  it('listClosedMonths retorna os meses ordenados', async () => {
    await repo.create(buildClosing({ month: '2026-07' }));
    await repo.create(buildClosing({ month: '2026-05' }));
    const result = await repo.listClosedMonths();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toEqual(['2026-05', '2026-07']);
  });

  it('deleteByMonth remove o fechamento do mês', async () => {
    await repo.create(buildClosing({ month: '2026-06' }));
    const result = await repo.deleteByMonth('2026-06');
    expect(isRight(result)).toBe(true);
    const found = await repo.findByMonth('2026-06');
    if (!isRight(found)) return;
    expect(found.right).toBeUndefined();
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.list(),
      repo.findByMonth('2026-06'),
      repo.listClosedMonths(),
      repo.create(buildClosing()),
      repo.deleteByMonth('2026-06'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
