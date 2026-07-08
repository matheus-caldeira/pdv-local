import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight } from '../../domain/shared/either';
import { PDVDatabase } from './dexie-database';
import { DexieCustomerRepository } from './repositories/dexie-customer.repository';

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

const data = (
  over: Partial<{ name: string; phone: string; addresses: string[] }> = {},
) => ({
  name: 'Maria',
  phone: '41999',
  addresses: [] as string[],
  extra: {} as Record<string, string>,
  ...over,
});

describe('DexieCustomerRepository CRUD', () => {
  it('creates, lists (sorted), finds by phone, updates and removes', async () => {
    const repo = new DexieCustomerRepository(db);
    await repo.create(data({ name: 'Bruno', phone: '1' }));
    const created = await repo.create(data({ name: 'Ana', phone: '2' }));

    const listed = await repo.list();
    expect(isRight(listed)).toBe(true);
    if (isRight(listed)) {
      expect(listed.right.map((c) => c.name)).toEqual(['Ana', 'Bruno']);
    }

    const found = await repo.findByPhone('1');
    expect(isRight(found) && found.right?.name).toBe('Bruno');

    const missing = await repo.findByPhone('999');
    expect(isRight(missing) && missing.right).toBeUndefined();

    if (isRight(created)) {
      const updated = await repo.update(
        created.right.uid,
        data({ name: 'Ana Paula', phone: '2', addresses: ['Rua X'] }),
      );
      expect(isRight(updated) && updated.right.name).toBe('Ana Paula');
      const stored = await db.customers.get(created.right.id!);
      expect(stored?.addresses).toEqual(['Rua X']);
      expect(stored?.createdAt).toBe(created.right.createdAt);

      await repo.remove(created.right.uid);
      expect(await db.customers.get(created.right.id!)).toBeUndefined();
    }
  });

  it('defaults extra to an empty object when creating without one', async () => {
    const repo = new DexieCustomerRepository(db);
    const withoutExtra = { name: 'Sem Extra', phone: '3', addresses: [] };
    const created = await repo.create(
      withoutExtra as Parameters<typeof repo.create>[0],
    );
    expect(isRight(created) && created.right.extra).toEqual({});
  });

  it('defaults extra to an empty object when updating without one', async () => {
    const repo = new DexieCustomerRepository(db);
    const created = await repo.create(data({ phone: '4' }));
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;
    const withoutExtra = { name: 'Sem Extra', phone: '4', addresses: [] };
    const updated = await repo.update(
      created.right.uid,
      withoutExtra as Parameters<typeof repo.update>[1],
    );
    expect(isRight(updated) && updated.right.extra).toEqual({});
  });

  it('returns Left when updating a record that does not exist', async () => {
    const repo = new DexieCustomerRepository(db);
    const updated = await repo.update('nonexistent-uid', data());
    expect(isLeft(updated)).toBe(true);
    if (isLeft(updated)) expect(updated.left.code).toBe('RECORD_NOT_FOUND');
  });

  it('returns Left for every method when the table fails', async () => {
    const repo = new DexieCustomerRepository(db);
    db.close();
    expect(isLeft(await repo.list())).toBe(true);
    expect(isLeft(await repo.findByPhone('1'))).toBe(true);
    expect(isLeft(await repo.create(data()))).toBe(true);
    expect(isLeft(await repo.update('uid', data()))).toBe(true);
    expect(isLeft(await repo.remove('uid'))).toBe(true);
  });
});
