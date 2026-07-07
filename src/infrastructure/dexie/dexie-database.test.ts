import { describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import Dexie from 'dexie';
import { PDVDatabase } from './dexie-database';

describe('migração v5', () => {
  it('gera uid e converte refs ao migrar de v4', async () => {
    globalThis.indexedDB = new IDBFactory();

    const legacy = new Dexie('pdv_v2');
    legacy.version(4).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt, stage',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
      customizationGroups: '++id, name',
      customizationItems: '++id, groupId, active',
      customers: '++id, &phone, name',
    });
    await legacy.open();

    const sessionId = await legacy.table('sessions').add({
      openedAt: 1,
      closedAt: null,
      cashInitial: 0,
      cashFinal: null,
      notes: '',
    });
    const customerId = await legacy.table('customers').add({
      phone: '41999999999',
      name: 'Maria',
      addresses: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const productId = await legacy.table('products').add({
      name: 'Combo',
      category: 'geral',
      costPrice: 10,
      salePrice: 20,
      stock: 5,
      active: true,
      customizationGroupIds: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const groupId = await legacy.table('customizationGroups').add({
      name: 'Adicionais',
      required: false,
      minQty: 0,
      maxQty: 2,
      chargeAfter: 0,
    });
    await legacy.table('customizationItems').add({
      groupId,
      name: 'Bacon',
      price: 5,
      maxQty: 1,
      chargeAfter: 0,
      active: true,
    });
    await legacy.table('cashMovements').add({
      sessionId,
      type: 'suprimento',
      amount: 50,
      reason: 'troco',
      createdAt: 1,
    });
    await legacy.table('orders').add({
      sessionId,
      customerId,
      status: 'open',
      stage: 'aceito',
      items: [
        {
          productId,
          name: 'Combo',
          salePrice: 20,
          costPrice: 10,
          qty: 1,
          customizations: [
            {
              groupName: 'Adicionais',
              items: [
                { name: 'Bacon', qty: 1, price: 5 },
                { name: 'Queijo', qty: 2, price: 3 },
              ],
            },
          ],
        },
      ],
      total: 25,
      paymentMethod: null,
      customerName: 'Maria',
      customerPhone: '41999999999',
      ticket: '1',
      createdAt: 1,
      updatedAt: 1,
    });
    await legacy.table('config').add({
      id: 1,
      name: 'Loja da Maria',
      document: '',
      phone: '',
      address: '',
      ticketCounter: 1,
      ticketLimit: 9999,
      ticketAutoReset: true,
      statusControlEnabled: false,
    });
    legacy.close();

    const db = new PDVDatabase();
    await db.open();

    const sessions = await db.sessions.toArray();
    const customers = await db.customers.toArray();
    const products = await db.products.toArray();
    const groups = await db.customizationGroups.toArray();
    const items = await db.customizationItems.toArray();
    const movements = await db.cashMovements.toArray();
    const orders = await db.orders.toArray();
    const config = await db.config.toArray();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].uid).toBeTruthy();

    expect(customers).toHaveLength(1);
    expect(customers[0].uid).toBeTruthy();

    expect(products).toHaveLength(1);
    expect(products[0].uid).toBeTruthy();

    expect(groups).toHaveLength(1);
    expect(groups[0].uid).toBeTruthy();

    expect(items).toHaveLength(1);
    expect(items[0].uid).toBeTruthy();
    expect(items[0].groupUid).toBe(groups[0].uid);
    expect(
      (items[0] as unknown as Record<string, unknown>).groupId,
    ).toBeUndefined();

    expect(movements).toHaveLength(1);
    expect(movements[0].uid).toBeTruthy();
    expect(movements[0].sessionUid).toBe(sessions[0].uid);
    expect(
      (movements[0] as unknown as Record<string, unknown>).sessionId,
    ).toBeUndefined();

    expect(orders).toHaveLength(1);
    const order = orders[0] as unknown as Record<string, unknown>;
    expect(order.uid).toBeTruthy();
    expect(order.sessionUid).toBe(sessions[0].uid);
    expect(order.customerUid).toBe(customers[0].uid);
    expect(order.sessionId).toBeUndefined();
    expect(order.customerId).toBeUndefined();

    const orderItems = order.items as Record<string, unknown>[];
    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].productUid).toBe(products[0].uid);
    expect(orderItems[0].productId).toBeUndefined();

    const flattened = orderItems[0].customizations as Record<string, unknown>[];
    expect(flattened).toEqual([
      { groupName: 'Adicionais', name: 'Bacon', qty: 1, price: 5 },
      { groupName: 'Adicionais', name: 'Queijo', qty: 2, price: 3 },
    ]);

    expect(config).toHaveLength(1);
    expect(config[0].businessTypeId).toBe('');
    expect(config[0].extra).toEqual({});

    db.close();
    await db.delete();
  });
});
