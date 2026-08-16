import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieOrderRepository } from './dexie-order.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type { NewOrder, OrderItem } from '../../../domain/order/order.entity';

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

  describe('findByUid', () => {
    it('encontra o pedido pelo uid', async () => {
      const order = baseOrder('s1');
      const created = await repo.create(order);
      expect(isRight(created)).toBe(true);

      const found = await repo.findByUid(order.uid);
      expect(isRight(found)).toBe(true);
      if (isRight(found)) expect(found.right?.uid).toBe(order.uid);
    });

    it('devolve undefined quando não existe', async () => {
      const found = await repo.findByUid('inexistente');
      expect(isRight(found)).toBe(true);
      if (isRight(found)) expect(found.right).toBeUndefined();
    });
  });

  describe('replaceItems', () => {
    it('substitui os itens e o total', async () => {
      const order = baseOrder('s1');
      await repo.create(order);

      const items: OrderItem[] = [
        { name: 'Refri', salePrice: 5, costPrice: 2, qty: 2 },
      ];
      const result = await repo.replaceItems(order.uid, items, 10);
      expect(isRight(result)).toBe(true);

      const found = await repo.findByUid(order.uid);
      if (isRight(found)) {
        expect(found.right?.items).toHaveLength(1);
        expect(found.right?.total).toBe(10);
      }
    });
  });

  describe('setStatus', () => {
    it('grava o status e o closedAt', async () => {
      const order = baseOrder('s1');
      await repo.create(order);

      const result = await repo.setStatus(order.uid, 'pending', 1_700_000);
      expect(isRight(result)).toBe(true);

      const found = await repo.findByUid(order.uid);
      if (isRight(found)) {
        expect(found.right?.status).toBe('pending');
        expect(found.right?.closedAt).toBe(1_700_000);
      }
    });

    it('limpa o closedAt quando não informado', async () => {
      const order = { ...baseOrder('s1'), closedAt: 1_700_000 };
      await repo.create(order);

      await repo.setStatus(order.uid, 'open');

      const found = await repo.findByUid(order.uid);
      if (isRight(found)) expect(found.right?.closedAt).toBeUndefined();
    });
  });

  it('findByUid, replaceItems e setStatus retornam Left com o banco fechado', async () => {
    db.close();
    const results: Either<unknown, unknown>[] = await Promise.all([
      repo.findByUid('tab-1'),
      repo.replaceItems('tab-1', [], 0),
      repo.setStatus('tab-1', 'open'),
    ]);
    for (const result of results) {
      expect(isLeft(result)).toBe(true);
    }
  });
});
