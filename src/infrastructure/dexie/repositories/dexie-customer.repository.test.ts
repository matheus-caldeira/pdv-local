import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieCustomerRepository } from './dexie-customer.repository';
import { isRight } from '../../../domain/shared/either';

describe('DexieCustomerRepository', () => {
  let db: PDVDatabase;
  let repo: DexieCustomerRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieCustomerRepository(db);
  });

  it('gera uid ao criar', async () => {
    const result = await repo.create({
      name: 'Ana',
      phone: '9',
      addresses: [],
      extra: {},
    });
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.uid).toBeTruthy();
  });

  it('findOrCreate sem phone retorna undefined', async () => {
    const result = await repo.findOrCreate({
      phone: '',
      name: 'X',
      address: '',
    });
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toBeUndefined();
  });

  it('findOrCreate com phone novo cria e retorna o uid', async () => {
    const result = await repo.findOrCreate({
      phone: '11',
      name: 'Bia',
      address: 'Rua 1',
    });
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(typeof result.right).toBe('string');
  });
});
