import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { PDVDatabase } from '../dexie-database';
import { DexieOrderRepository } from './dexie-order.repository';
import { isLeft, isRight, type Either } from '../../../domain/shared/either';
import { createUid } from '../../../domain/shared/uid';
import type {
  NewOrder,
  Order,
  OrderItem,
} from '../../../domain/order/order.entity';

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

  describe('listPage', () => {
    async function seed(count: number, overrides: Partial<NewOrder>[] = []) {
      for (let index = 0; index < count; index++) {
        await repo.create({
          ...baseOrder('s1'),
          ticket: String(index + 1).padStart(3, '0'),
          createdAt: index,
          ...(overrides[index] ?? {}),
        });
      }
    }

    it('devolve a primeira página ordenada do mais novo para o mais antigo', async () => {
      await seed(5);

      const result = await repo.listPage({ offset: 0, limit: 2 });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders.map((order) => order.ticket)).toEqual([
        '005',
        '004',
      ]);
      expect(result.right.total).toBe(5);
      expect(result.right.hasMore).toBe(true);
    });

    it('avança pelo offset sem repetir pedidos', async () => {
      await seed(5);

      const result = await repo.listPage({ offset: 2, limit: 2 });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders.map((order) => order.ticket)).toEqual([
        '003',
        '002',
      ]);
      expect(result.right.hasMore).toBe(true);
    });

    it('marca hasMore como falso na última página exata', async () => {
      await seed(4);

      const result = await repo.listPage({ offset: 2, limit: 2 });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders).toHaveLength(2);
      expect(result.right.hasMore).toBe(false);
    });

    it('filtra por vários status ao mesmo tempo', async () => {
      await seed(4, [
        { status: 'open' },
        { status: 'paid' },
        { status: 'pending' },
        { status: 'cancelled' },
      ]);

      const result = await repo.listPage({
        statuses: ['open', 'pending'],
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders.map((order) => order.status).sort()).toEqual([
        'open',
        'pending',
      ]);
      expect(result.right.total).toBe(2);
    });

    it('trata lista de status vazia como todos os status', async () => {
      await seed(3, [
        { status: 'open' },
        { status: 'paid' },
        { status: 'cancelled' },
      ]);

      const result = await repo.listPage({
        statuses: [],
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (isRight(result)) expect(result.right.total).toBe(3);
    });

    it('busca pelo número da comanda', async () => {
      await seed(3);

      const result = await repo.listPage({
        term: '002',
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders).toHaveLength(1);
      expect(result.right.orders[0].ticket).toBe('002');
    });

    it('busca pelo nome do cliente ignorando maiúsculas', async () => {
      await seed(2, [{ customerName: 'Ana Paula' }, { customerName: 'Bruno' }]);

      const result = await repo.listPage({
        term: 'ana',
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders).toHaveLength(1);
      expect(result.right.orders[0].customerName).toBe('Ana Paula');
    });

    it('combina busca e status no mesmo total', async () => {
      await seed(3, [
        { customerName: 'Ana', status: 'open' },
        { customerName: 'Ana', status: 'paid' },
        { customerName: 'Bruno', status: 'open' },
      ]);

      const result = await repo.listPage({
        statuses: ['open'],
        term: 'ana',
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.total).toBe(1);
      expect(result.right.orders[0].customerName).toBe('Ana');
    });

    it('devolve página vazia sem resultados', async () => {
      await seed(2);

      const result = await repo.listPage({
        term: 'inexistente',
        offset: 0,
        limit: 10,
      });

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders).toHaveLength(0);
      expect(result.right.total).toBe(0);
      expect(result.right.hasMore).toBe(false);
    });

    it('retorna Left com o banco fechado', async () => {
      db.close();
      const result = await repo.listPage({ offset: 0, limit: 10 });
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('listFinishedPage', () => {
    async function seedFinished(count: number, sessionUid = 's1') {
      for (let index = 0; index < count; index++) {
        await repo.create({
          ...baseOrder(sessionUid),
          ticket: String(index + 1).padStart(3, '0'),
          stage: 'finalizado',
          updatedAt: index,
        });
      }
    }

    it('lista finalizados da sessão do mais recente para o mais antigo', async () => {
      await seedFinished(3);

      const result = await repo.listFinishedPage('s1', 0, 2);

      expect(isRight(result)).toBe(true);
      if (!isRight(result)) return;
      expect(result.right.orders.map((order) => order.ticket)).toEqual([
        '003',
        '002',
      ]);
      expect(result.right.total).toBe(3);
      expect(result.right.hasMore).toBe(true);
    });

    it('ignora pedidos de outra sessão', async () => {
      await seedFinished(1, 's1');
      await seedFinished(2, 's2');

      const result = await repo.listFinishedPage('s1', 0, 10);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) expect(result.right.total).toBe(1);
    });

    it('ignora pedidos cancelados', async () => {
      await repo.create({
        ...baseOrder('s1'),
        stage: 'finalizado',
        status: 'cancelled',
      });

      const result = await repo.listFinishedPage('s1', 0, 10);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) expect(result.right.total).toBe(0);
    });

    it('ignora pedidos que ainda não foram finalizados', async () => {
      await repo.create({ ...baseOrder('s1'), stage: 'em_preparo' });

      const result = await repo.listFinishedPage('s1', 0, 10);

      expect(isRight(result)).toBe(true);
      if (isRight(result)) expect(result.right.total).toBe(0);
    });

    it('retorna Left com o banco fechado', async () => {
      db.close();
      const result = await repo.listFinishedPage('s1', 0, 10);
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('observeActiveBySession', () => {
    it('emite apenas os pedidos da sessão fora da etapa finalizado', async () => {
      await repo.create({ ...baseOrder('s1'), stage: 'aceito' });
      await repo.create({ ...baseOrder('s1'), stage: 'finalizado' });
      await repo.create({ ...baseOrder('s2'), stage: 'aceito' });

      const stream = repo.observeActiveBySession('s1');
      const snapshot = await new Promise<Order[]>((resolve) => {
        const subscription = stream.subscribe((value) => {
          resolve(value);
          subscription.unsubscribe();
        });
      });

      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].stage).toBe('aceito');
    });

    it('não emite pedidos cancelados', async () => {
      await repo.create({
        ...baseOrder('s1'),
        stage: 'aceito',
        status: 'cancelled',
      });

      const stream = repo.observeActiveBySession('s1');
      const snapshot = await new Promise<Order[]>((resolve) => {
        const subscription = stream.subscribe((value) => {
          resolve(value);
          subscription.unsubscribe();
        });
      });

      expect(snapshot).toHaveLength(0);
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
