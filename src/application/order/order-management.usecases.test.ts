import { describe, expect, it, vi } from 'vitest';
import { isRight, right, type Either } from '../../domain/shared/either';
import type { Observable } from '../../domain/shared/observable';
import type { InfrastructureError } from '../../infrastructure/errors';
import type {
  NewOrder,
  Order,
  OrderStage,
} from '../../domain/order/order.entity';
import type {
  OrderPage,
  OrderQuery,
  OrderRepository,
} from '../../domain/order/order.repository';
import {
  makeCancelOrder,
  makeListFinishedOrderPage,
  makeListOrderPage,
  makeListOrders,
  makeMarkOrderPaid,
  makeObserveActiveOrders,
  makeObserveActiveSessionOrders,
  makeObserveSessionOrders,
  makeSetOrderStage,
} from './order-management.usecases';

class FakeOrderRepository implements OrderRepository {
  paid: { uid: string; method: string } | null = null;
  cancelled: string | null = null;
  staged: { uid: string; stage: OrderStage } | null = null;
  observedSession: string | null = null;
  observedActive = false;
  observedActiveSession: string | null = null;
  query: OrderQuery | null = null;
  finishedQuery: {
    sessionUid: string;
    offset: number;
    limit: number;
  } | null = null;
  readonly stream: Observable<Order[]> = {
    subscribe: () => ({ unsubscribe: () => {} }),
  };

  async create(order: NewOrder): Promise<Either<InfrastructureError, Order>> {
    return right({ ...order, id: 1 } as Order);
  }

  async listAll(): Promise<Either<InfrastructureError, Order[]>> {
    return right([{ id: 1 } as Order]);
  }

  async listBySession(): Promise<Either<InfrastructureError, Order[]>> {
    return right([]);
  }

  observeBySession(sessionUid: string): Observable<Order[]> {
    this.observedSession = sessionUid;
    return this.stream;
  }

  observeActiveStages(): Observable<Order[]> {
    this.observedActive = true;
    return this.stream;
  }

  async markAsPaid(
    uid: string,
    paymentMethod: string,
  ): Promise<Either<InfrastructureError, void>> {
    this.paid = { uid, method: paymentMethod };
    return right(undefined);
  }

  async cancel(uid: string): Promise<Either<InfrastructureError, void>> {
    this.cancelled = uid;
    return right(undefined);
  }

  async setStage(
    uid: string,
    stage: OrderStage,
  ): Promise<Either<InfrastructureError, void>> {
    this.staged = { uid, stage };
    return right(undefined);
  }

  async findByUid(): Promise<Either<InfrastructureError, Order | undefined>> {
    return right(undefined);
  }

  async replaceItems(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }

  async setStatus(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }

  async listPage(
    query: OrderQuery,
  ): Promise<Either<InfrastructureError, OrderPage>> {
    this.query = query;
    return right({ orders: [{ id: 2 } as Order], total: 7, hasMore: true });
  }

  async listFinishedPage(
    sessionUid: string,
    offset: number,
    limit: number,
  ): Promise<Either<InfrastructureError, OrderPage>> {
    this.finishedQuery = { sessionUid, offset, limit };
    return right({ orders: [{ id: 3 } as Order], total: 4, hasMore: false });
  }

  observeActiveBySession(sessionUid: string): Observable<Order[]> {
    this.observedActiveSession = sessionUid;
    return this.stream;
  }
}

describe('order management use cases', () => {
  it('lists all orders', async () => {
    const repo = new FakeOrderRepository();
    const result = await makeListOrders(repo)();
    expect(isRight(result) && result.right).toHaveLength(1);
  });

  it('observes orders of a session', () => {
    const repo = new FakeOrderRepository();
    const stream = makeObserveSessionOrders(repo)('s7');
    expect(repo.observedSession).toBe('s7');
    expect(stream).toBe(repo.stream);
  });

  it('observes active orders', () => {
    const repo = new FakeOrderRepository();
    const stream = makeObserveActiveOrders(repo)();
    expect(repo.observedActive).toBe(true);
    expect(stream).toBe(repo.stream);
  });

  it('marks an order as paid', async () => {
    const repo = new FakeOrderRepository();
    await makeMarkOrderPaid(repo)('order-3', 'pix');
    expect(repo.paid).toEqual({ uid: 'order-3', method: 'pix' });
  });

  it('cancels an order', async () => {
    const repo = new FakeOrderRepository();
    await makeCancelOrder(repo)('order-5');
    expect(repo.cancelled).toBe('order-5');
  });

  it('sets an order stage', async () => {
    const repo = new FakeOrderRepository();
    await makeSetOrderStage(repo)('order-9', 'em_preparo');
    expect(repo.staged).toEqual({ uid: 'order-9', stage: 'em_preparo' });
  });

  it('lists a page of orders forwarding the query', async () => {
    const repo = new FakeOrderRepository();
    const result = await makeListOrderPage(repo)({
      statuses: ['open', 'pending'],
      term: 'ana',
      offset: 30,
      limit: 30,
    });
    expect(repo.query).toEqual({
      statuses: ['open', 'pending'],
      term: 'ana',
      offset: 30,
      limit: 30,
    });
    expect(isRight(result) && result.right.total).toBe(7);
  });

  it('lists a page of finished orders of a session', async () => {
    const repo = new FakeOrderRepository();
    const result = await makeListFinishedOrderPage(repo)('s3', 20, 20);
    expect(repo.finishedQuery).toEqual({
      sessionUid: 's3',
      offset: 20,
      limit: 20,
    });
    expect(isRight(result) && result.right.total).toBe(4);
  });

  it('observes active orders of a session', () => {
    const repo = new FakeOrderRepository();
    const stream = makeObserveActiveSessionOrders(repo)('s4');
    expect(repo.observedActiveSession).toBe('s4');
    expect(stream).toBe(repo.stream);
  });

  it('subscribes to the returned observable', () => {
    const repo = new FakeOrderRepository();
    const next = vi.fn();
    const sub = makeObserveActiveOrders(repo)().subscribe(next);
    sub.unsubscribe();
    expect(typeof sub.unsubscribe).toBe('function');
  });
});
