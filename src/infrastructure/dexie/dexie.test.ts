import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { isLeft, isRight, left, right } from '../../domain/shared/either';
import type { NewOrder } from '../../domain/order/order.entity';
import { PDVDatabase } from './dexie-database';
import { DexieConfigRepository } from './repositories/dexie-config.repository';
import { DexieCustomerRepository } from './repositories/dexie-customer.repository';
import { DexieProductRepository } from './repositories/dexie-product.repository';
import { DexieOrderRepository } from './repositories/dexie-order.repository';
import { DexieUnitOfWork } from './dexie-unit-of-work';
import { toInfrastructureError } from './dexie-errors';
import {
  ConnectorError,
  TransactionFailedError,
  UniqueConstraintError,
} from '../errors';

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

const newOrder = (over: Partial<NewOrder> = {}): NewOrder => ({
  sessionId: 1,
  items: [],
  total: 0,
  paymentMethod: 'pix',
  customerName: 'Maria',
  customerPhone: '41999',
  ticket: '0001',
  stage: 'aceito',
  status: 'paid',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('DexieConfigRepository', () => {
  it('reads defaults when nothing is stored', async () => {
    const repo = new DexieConfigRepository(db);
    const result = await repo.read();
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.ticketCounter).toBe(1);
      expect(result.right.ticketLimit).toBe(9999);
    }
  });

  it('claims a ticket and advances the counter', async () => {
    const repo = new DexieConfigRepository(db);
    const first = await repo.claimTicket();
    const second = await repo.claimTicket();
    expect(isRight(first) && first.right).toBe('0001');
    expect(isRight(second) && second.right).toBe('0002');
    const config = await repo.read();
    expect(isRight(config) && config.right.ticketCounter).toBe(3);
  });
});

describe('DexieCustomerRepository', () => {
  it('returns undefined when the phone is blank', async () => {
    const repo = new DexieCustomerRepository(db);
    const result = await repo.findOrCreate({
      phone: '   ',
      name: 'X',
      address: 'Y',
    });
    expect(isRight(result) && result.right).toBeUndefined();
  });

  it('creates a new customer with the address', async () => {
    const repo = new DexieCustomerRepository(db);
    const result = await repo.findOrCreate({
      phone: '41999',
      name: 'Maria',
      address: 'Rua A',
    });
    expect(isRight(result)).toBe(true);
    const stored = await db.customers.where('phone').equals('41999').first();
    expect(stored?.name).toBe('Maria');
    expect(stored?.addresses).toEqual(['Rua A']);
  });

  it('creates with the default name and no address when both are blank', async () => {
    const repo = new DexieCustomerRepository(db);
    await repo.findOrCreate({ phone: '41888', name: '  ', address: '  ' });
    const stored = await db.customers.where('phone').equals('41888').first();
    expect(stored?.name).toBe('Consumidor');
    expect(stored?.addresses).toEqual([]);
  });

  it('appends a new address and upgrades the default name', async () => {
    const repo = new DexieCustomerRepository(db);
    await db.customers.add({
      name: 'Consumidor',
      phone: '41999',
      addresses: ['Rua A'],
      createdAt: 1,
      updatedAt: 1,
    });
    await repo.findOrCreate({
      phone: '41999',
      name: 'Maria',
      address: 'Rua B',
    });
    const stored = await db.customers.where('phone').equals('41999').first();
    expect(stored?.name).toBe('Maria');
    expect(stored?.addresses).toEqual(['Rua A', 'Rua B']);
  });

  it('keeps the existing address list when the address repeats', async () => {
    const repo = new DexieCustomerRepository(db);
    await db.customers.add({
      name: 'Maria',
      phone: '41999',
      addresses: ['Rua A'],
      createdAt: 1,
      updatedAt: 1,
    });
    await repo.findOrCreate({
      phone: '41999',
      name: 'Maria',
      address: 'Rua A',
    });
    const stored = await db.customers.where('phone').equals('41999').first();
    expect(stored?.addresses).toEqual(['Rua A']);
  });
});

describe('DexieProductRepository', () => {
  it('decrements stock only for products with stock', async () => {
    const repo = new DexieProductRepository(db);
    const id = await db.products.add({
      name: 'P',
      category: 'C',
      costPrice: 1,
      salePrice: 2,
      stock: 5,
      active: true,
      customizationGroupIds: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const empty = await db.products.add({
      name: 'Q',
      category: 'C',
      costPrice: 1,
      salePrice: 2,
      stock: 0,
      active: true,
      customizationGroupIds: [],
      createdAt: 1,
      updatedAt: 1,
    });
    const result = await repo.decrementStock([
      { productId: id as number, qty: 2 },
      { productId: empty as number, qty: 1 },
      { productId: 9999, qty: 1 },
    ]);
    expect(isRight(result)).toBe(true);
    expect((await db.products.get(id))?.stock).toBe(3);
    expect((await db.products.get(empty))?.stock).toBe(0);
  });
});

describe('DexieOrderRepository', () => {
  it('persists an order and returns it with an id', async () => {
    const repo = new DexieOrderRepository(db);
    const result = await repo.create(newOrder());
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.id).toBeDefined();
    }
    expect(await db.orders.count()).toBe(1);
  });

  it('lists only the orders of a given session', async () => {
    const repo = new DexieOrderRepository(db);
    await repo.create(newOrder({ sessionId: 1 }));
    await repo.create(newOrder({ sessionId: 1 }));
    await repo.create(newOrder({ sessionId: 2 }));
    const result = await repo.listBySession(1);
    expect(isRight(result) && result.right).toHaveLength(2);
  });

  it('lists all orders sorted by recency', async () => {
    const repo = new DexieOrderRepository(db);
    await repo.create(newOrder({ createdAt: 1 }));
    await repo.create(newOrder({ createdAt: 5 }));
    const result = await repo.listAll();
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.map((o) => o.createdAt)).toEqual([5, 1]);
    }
  });

  it('marks an order as paid', async () => {
    const repo = new DexieOrderRepository(db);
    const created = await repo.create(newOrder({ status: 'open' }));
    if (!isRight(created)) throw new Error('setup');
    const result = await repo.markAsPaid(created.right.id!, 'dinheiro');
    expect(isRight(result)).toBe(true);
    const stored = await db.orders.get(created.right.id!);
    expect(stored?.status).toBe('paid');
    expect(stored?.paymentMethod).toBe('dinheiro');
  });

  it('cancels an order', async () => {
    const repo = new DexieOrderRepository(db);
    const created = await repo.create(newOrder());
    if (!isRight(created)) throw new Error('setup');
    await repo.cancel(created.right.id!);
    const stored = await db.orders.get(created.right.id!);
    expect(stored?.status).toBe('cancelled');
  });

  it('sets an order stage', async () => {
    const repo = new DexieOrderRepository(db);
    const created = await repo.create(newOrder({ stage: 'aceito' }));
    if (!isRight(created)) throw new Error('setup');
    await repo.setStage(created.right.id!, 'em_preparo');
    const stored = await db.orders.get(created.right.id!);
    expect(stored?.stage).toBe('em_preparo');
  });

  it('observes the orders of a session reactively', async () => {
    const repo = new DexieOrderRepository(db);
    await repo.create(newOrder({ sessionId: 1 }));
    const first = await new Promise<number>((resolve) => {
      const sub = repo.observeBySession(1).subscribe((orders) => {
        sub.unsubscribe();
        resolve(orders.length);
      });
    });
    expect(first).toBe(1);
  });

  it('observes active stages excluding cancelled orders', async () => {
    const repo = new DexieOrderRepository(db);
    await repo.create(newOrder({ stage: 'aceito', status: 'open' }));
    await repo.create(newOrder({ stage: 'a_caminho', status: 'cancelled' }));
    await repo.create(newOrder({ stage: 'finalizado', status: 'paid' }));
    const count = await new Promise<number>((resolve) => {
      const sub = repo.observeActiveStages().subscribe((orders) => {
        sub.unsubscribe();
        resolve(orders.length);
      });
    });
    expect(count).toBe(1);
  });
});

describe('DexieUnitOfWork', () => {
  it('commits all writes when the work succeeds', async () => {
    const uow = new DexieUnitOfWork(db);
    const result = await uow.run(async (repos) => {
      await repos.config.claimTicket();
      return repos.orders.create(newOrder());
    });
    expect(isRight(result)).toBe(true);
    expect(await db.orders.count()).toBe(1);
  });

  it('rolls back every write when the work returns a Left', async () => {
    const uow = new DexieUnitOfWork(db);
    const result = await uow.run(async (repos) => {
      await repos.orders.create(newOrder());
      return left(new ConnectorError('boom'));
    });
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(ConnectorError);
    expect(await db.orders.count()).toBe(0);
  });

  it('wraps an unexpected throw into a TransactionFailedError', async () => {
    const uow = new DexieUnitOfWork(db);
    const result = await uow.run(async () => {
      throw new Error('unexpected');
    });
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(TransactionFailedError);
    }
  });

  it('returns the right value on success', async () => {
    const uow = new DexieUnitOfWork(db);
    const result = await uow.run(async () => right(123));
    expect(isRight(result) && result.right).toBe(123);
  });
});

describe('toInfrastructureError', () => {
  it('maps a ConstraintError to UniqueConstraintError', () => {
    const error = new Error('dup');
    error.name = 'ConstraintError';
    expect(toInfrastructureError(error)).toBeInstanceOf(UniqueConstraintError);
  });

  it('maps any other error to ConnectorError', () => {
    expect(toInfrastructureError(new Error('x'))).toBeInstanceOf(
      ConnectorError,
    );
  });

  it('handles a non-error cause', () => {
    expect(toInfrastructureError({ name: 'Whatever' })).toBeInstanceOf(
      ConnectorError,
    );
  });

  it('handles a cause without a name', () => {
    expect(toInfrastructureError({})).toBeInstanceOf(ConnectorError);
  });
});

describe('repository error paths', () => {
  it('DexieOrderRepository returns Left when the table fails', async () => {
    const repo = new DexieOrderRepository(db);
    db.close();
    const result = await repo.create(newOrder());
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(ConnectorError);
  });

  it('DexieOrderRepository returns Left when listing fails', async () => {
    const repo = new DexieOrderRepository(db);
    db.close();
    expect(isLeft(await repo.listBySession(1))).toBe(true);
    expect(isLeft(await repo.listAll())).toBe(true);
    expect(isLeft(await repo.markAsPaid(1, 'pix'))).toBe(true);
    expect(isLeft(await repo.cancel(1))).toBe(true);
    expect(isLeft(await repo.setStage(1, 'aceito'))).toBe(true);
  });

  it('DexieProductRepository returns Left when the table fails', async () => {
    const repo = new DexieProductRepository(db);
    db.close();
    const result = await repo.decrementStock([{ productId: 1, qty: 1 }]);
    expect(isLeft(result)).toBe(true);
  });

  it('DexieCustomerRepository returns Left when the table fails', async () => {
    const repo = new DexieCustomerRepository(db);
    db.close();
    const result = await repo.findOrCreate({
      phone: '41999',
      name: 'A',
      address: '',
    });
    expect(isLeft(result)).toBe(true);
  });

  it('DexieConfigRepository read returns Left when the table fails', async () => {
    const repo = new DexieConfigRepository(db);
    db.close();
    const result = await repo.read();
    expect(isLeft(result)).toBe(true);
  });

  it('DexieConfigRepository claimTicket returns Left when the table fails', async () => {
    const repo = new DexieConfigRepository(db);
    db.close();
    const result = await repo.claimTicket();
    expect(isLeft(result)).toBe(true);
  });
});
