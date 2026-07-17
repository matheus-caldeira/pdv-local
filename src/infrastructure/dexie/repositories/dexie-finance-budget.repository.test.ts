import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceBudgetRepository } from './dexie-finance-budget.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';

describe('DexieFinanceBudgetRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceBudgetRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceBudgetRepository(db);
  });

  it('save cria item do modelo com month null', async () => {
    const result = await repo.save({
      categoryUid: 'cat-1',
      month: null,
      amount: 500,
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.uid).toBeTruthy();
    expect(result.right.id).toBeTruthy();
    expect(result.right.month).toBeNull();
    expect(result.right.amount).toBe(500);
    expect(result.right.createdAt).toBeGreaterThan(0);
    expect(result.right.updatedAt).toBe(result.right.createdAt);
  });

  it('save atualiza item existente da mesma categoria e mês preservando uid', async () => {
    const first = await repo.save({
      categoryUid: 'cat-1',
      month: '2026-07',
      amount: 100,
    });
    if (!isRight(first)) return;
    const second = await repo.save({
      categoryUid: 'cat-1',
      month: '2026-07',
      amount: 250,
    });
    expect(isRight(second)).toBe(true);
    if (!isRight(second)) return;
    expect(second.right.uid).toBe(first.right.uid);
    expect(second.right.amount).toBe(250);
    expect(second.right.createdAt).toBe(first.right.createdAt);
    const all = await repo.listAll();
    if (!isRight(all)) return;
    expect(all.right).toHaveLength(1);
  });

  it('save distingue modelo e override do mês da mesma categoria', async () => {
    await repo.save({ categoryUid: 'cat-1', month: null, amount: 100 });
    await repo.save({ categoryUid: 'cat-1', month: '2026-07', amount: 80 });
    const all = await repo.listAll();
    expect(isRight(all)).toBe(true);
    if (!isRight(all)) return;
    expect(all.right).toHaveLength(2);
    expect(all.right.map((item) => item.month).sort()).toEqual([
      '2026-07',
      null,
    ]);
  });

  it('save de categorias diferentes cria itens distintos', async () => {
    await repo.save({ categoryUid: 'cat-1', month: null, amount: 100 });
    await repo.save({ categoryUid: 'cat-2', month: null, amount: 200 });
    const all = await repo.listAll();
    if (!isRight(all)) return;
    expect(all.right).toHaveLength(2);
  });

  it('remove exclui pelo uid', async () => {
    const created = await repo.save({
      categoryUid: 'cat-1',
      month: null,
      amount: 100,
    });
    if (!isRight(created)) return;
    const result = await repo.remove(created.right.uid);
    expect(isRight(result)).toBe(true);
    const all = await repo.listAll();
    if (!isRight(all)) return;
    expect(all.right).toHaveLength(0);
  });

  it('countByCategory conta itens da categoria', async () => {
    await repo.save({ categoryUid: 'cat-1', month: null, amount: 100 });
    await repo.save({ categoryUid: 'cat-1', month: '2026-07', amount: 80 });
    await repo.save({ categoryUid: 'cat-2', month: null, amount: 50 });
    const result = await repo.countByCategory('cat-1');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBe(2);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.listAll(),
      repo.save({ categoryUid: 'cat-1', month: null, amount: 1 }),
      repo.remove('uid'),
      repo.countByCategory('cat-1'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
