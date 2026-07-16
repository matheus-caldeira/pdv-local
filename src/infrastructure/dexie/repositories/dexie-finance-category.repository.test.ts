import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceCategoryRepository } from './dexie-finance-category.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';

describe('DexieFinanceCategoryRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceCategoryRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceCategoryRepository(db);
  });

  it('create gera uid, kind e archived false', async () => {
    const result = await repo.create({ name: 'Mercado', kind: 'expense' });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.uid).toBeTruthy();
    expect(result.right.id).toBeTruthy();
    expect(result.right.name).toBe('Mercado');
    expect(result.right.kind).toBe('expense');
    expect(result.right.archived).toBe(false);
  });

  it('list ordena por nome', async () => {
    await repo.create({ name: 'Transporte', kind: 'expense' });
    await repo.create({ name: 'Mercado', kind: 'expense' });
    const result = await repo.list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((category) => category.name)).toEqual([
      'Mercado',
      'Transporte',
    ]);
  });

  it('update altera name e archived preservando kind', async () => {
    const created = await repo.create({ name: 'Mercado', kind: 'expense' });
    if (!isRight(created)) return;
    const result = await repo.update(created.right.uid, {
      name: 'Feira',
      archived: true,
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.name).toBe('Feira');
    expect(result.right.archived).toBe(true);
    expect(result.right.kind).toBe('expense');
  });

  it('update de uid inexistente retorna RECORD_NOT_FOUND', async () => {
    const result = await repo.update('nao-existe', { name: 'X' });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove pelo uid', async () => {
    const created = await repo.create({ name: 'Mercado', kind: 'expense' });
    if (!isRight(created)) return;
    const result = await repo.delete(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.list();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('ensureDefaults cria todas quando a tabela está vazia', async () => {
    const result = await repo.ensureDefaults([
      { name: 'Moradia', kind: 'expense' },
      { name: 'Salário', kind: 'income' },
    ]);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(2);
    expect(result.right?.[0].uid).toBeTruthy();
    expect(result.right?.[0].id).toBeTruthy();
    expect(result.right?.[1].id).toBeTruthy();
    const listed = await repo.list();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(2);
  });

  it('ensureDefaults retorna null quando já existe categoria', async () => {
    await repo.create({ name: 'Mercado', kind: 'expense' });
    const result = await repo.ensureDefaults([
      { name: 'Moradia', kind: 'expense' },
    ]);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBeNull();
    const listed = await repo.list();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(1);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.list(),
      repo.create({ name: 'X', kind: 'expense' }),
      repo.update('uid', { name: 'X' }),
      repo.delete('uid'),
      repo.ensureDefaults([{ name: 'X', kind: 'income' }]),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
