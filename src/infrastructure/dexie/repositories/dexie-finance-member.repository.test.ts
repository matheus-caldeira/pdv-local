import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieFinanceMemberRepository } from './dexie-finance-member.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';

describe('DexieFinanceMemberRepository', () => {
  let db: PDVDatabase;
  let repo: DexieFinanceMemberRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieFinanceMemberRepository(db);
  });

  it('create gera uid, archived false e createdAt', async () => {
    const result = await repo.create('Ana');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.uid).toBeTruthy();
    expect(result.right.id).toBeTruthy();
    expect(result.right.name).toBe('Ana');
    expect(result.right.archived).toBe(false);
    expect(result.right.createdAt).toBeGreaterThan(0);
  });

  it('list ordena por nome', async () => {
    await repo.create('Zeca');
    await repo.create('Ana');
    const result = await repo.list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((member) => member.name)).toEqual(['Ana', 'Zeca']);
  });

  it('update altera name e archived preservando uid', async () => {
    const created = await repo.create('Ana');
    if (!isRight(created)) return;
    const result = await repo.update(created.right.uid, {
      name: 'Ana Maria',
      archived: true,
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.name).toBe('Ana Maria');
    expect(result.right.archived).toBe(true);
    expect(result.right.uid).toBe(created.right.uid);
    const listed = await repo.list();
    if (!isRight(listed)) return;
    expect(listed.right[0].name).toBe('Ana Maria');
  });

  it('update de uid inexistente retorna RECORD_NOT_FOUND', async () => {
    const result = await repo.update('nao-existe', { name: 'X' });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('RECORD_NOT_FOUND');
  });

  it('delete remove pelo uid', async () => {
    const created = await repo.create('Ana');
    if (!isRight(created)) return;
    const result = await repo.delete(created.right.uid);
    expect(isRight(result)).toBe(true);
    const listed = await repo.list();
    if (!isRight(listed)) return;
    expect(listed.right).toHaveLength(0);
  });

  it('ensureDefault cria quando a tabela está vazia', async () => {
    const result = await repo.ensureDefault('Eu');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right?.name).toBe('Eu');
    expect(result.right?.uid).toBeTruthy();
    expect(result.right?.id).toBeTruthy();
  });

  it('ensureDefault retorna null quando já existe membro, mesmo arquivado', async () => {
    const created = await repo.create('Ana');
    if (!isRight(created)) return;
    await repo.update(created.right.uid, { archived: true });
    const result = await repo.ensureDefault('Eu');
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
      repo.create('Ana'),
      repo.update('uid', { name: 'X' }),
      repo.delete('uid'),
      repo.ensureDefault('Eu'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
