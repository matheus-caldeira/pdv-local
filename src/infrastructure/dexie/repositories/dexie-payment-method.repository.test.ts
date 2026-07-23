import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { PDVDatabase } from '../dexie-database';
import { DexiePaymentMethodRepository } from './dexie-payment-method.repository';

describe('DexiePaymentMethodRepository', () => {
  let db: PDVDatabase;
  let repo: DexiePaymentMethodRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexiePaymentMethodRepository(db);
  });

  const card = {
    uid: 'card-1',
    name: 'Nubank',
    type: 'credit' as const,
    closingDay: 25,
    dueDay: 5,
    archived: false,
    createdAt: 1,
  };

  it('cria e lista ordenado por nome', async () => {
    await repo.create({ ...card, uid: 'b', name: 'Zeta' });
    await repo.create({ ...card, uid: 'a', name: 'Alfa' });
    const result = await repo.list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.map((m) => m.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('encontra por uid', async () => {
    await repo.create(card);
    const result = await repo.findByUid('card-1');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right?.name).toBe('Nubank');
  });

  it('devolve undefined para uid inexistente', async () => {
    const result = await repo.findByUid('nao-existe');
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toBeUndefined();
  });

  it('atualiza', async () => {
    await repo.create(card);
    const result = await repo.update('card-1', { archived: true });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.archived).toBe(true);
  });

  it('devolve Left ao atualizar uid inexistente', async () => {
    const result = await repo.update('nao-existe', { archived: true });
    expect(isLeft(result)).toBe(true);
  });

  it('exclui', async () => {
    await repo.create(card);
    await repo.delete('card-1');
    const result = await repo.list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(0);
  });

  it('todos os métodos retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.list(),
      repo.findByUid('card-1'),
      repo.create(card),
      repo.update('card-1', { archived: true }),
      repo.delete('card-1'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
