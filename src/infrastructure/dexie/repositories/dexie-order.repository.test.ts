import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieOrderRepository } from './dexie-order.repository';
import { isRight } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type { NewOrder } from '../../../domain/order/order.entity';

function baseOrder(sessionUid: string): NewOrder {
  return {
    uid: createUid(),
    businessTypeId: 'quick_sale',
    sessionUid,
    items: [{ name: 'X', salePrice: 1, costPrice: 0, qty: 1 }],
    total: 1,
    paymentMethod: null,
    customerName: '',
    customerPhone: '',
    ticket: '',
    stage: 'aceito',
    status: 'open',
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('DexieOrderRepository refs por uid', () => {
  let db: PDVDatabase;
  let repo: DexieOrderRepository;

  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory();
    db = new PDVDatabase();
    await db.delete();
    await db.open();
    repo = new DexieOrderRepository(db);
  });

  it('lista por sessionUid', async () => {
    await repo.create(baseOrder('s1'));
    await repo.create(baseOrder('s2'));
    const result = await repo.listBySession('s1');
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toHaveLength(1);
  });

  it('setStage altera pela uid', async () => {
    const order = baseOrder('s1');
    const created = await repo.create(order);
    expect(isRight(created)).toBe(true);
    if (!isRight(created)) return;

    const result = await repo.setStage(order.uid, 'em_preparo');
    expect(isRight(result)).toBe(true);

    const listed = await repo.listBySession('s1');
    expect(isRight(listed)).toBe(true);
    if (isRight(listed)) expect(listed.right[0].stage).toBe('em_preparo');
  });

  it('markAsPaid altera pela uid', async () => {
    const order = baseOrder('s1');
    await repo.create(order);

    const result = await repo.markAsPaid(order.uid, 'pix');
    expect(isRight(result)).toBe(true);

    const listed = await repo.listBySession('s1');
    if (isRight(listed)) {
      expect(listed.right[0].status).toBe('paid');
      expect(listed.right[0].paymentMethod).toBe('pix');
    }
  });

  it('cancel altera pela uid', async () => {
    const order = baseOrder('s1');
    await repo.create(order);

    const result = await repo.cancel(order.uid);
    expect(isRight(result)).toBe(true);

    const listed = await repo.listBySession('s1');
    if (isRight(listed)) expect(listed.right[0].status).toBe('cancelled');
  });

  it('observeBySession filtra por sessionUid', async () => {
    await repo.create(baseOrder('s1'));
    await repo.create(baseOrder('s2'));
    const orders = await repo.observeBySession('s1');
    const snapshot = await new Promise((resolve) => {
      const subscription = orders.subscribe((value) => {
        resolve(value);
        subscription.unsubscribe();
      });
    });
    expect(snapshot).toHaveLength(1);
  });
});
