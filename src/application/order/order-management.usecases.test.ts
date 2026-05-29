import { describe, expect, it, vi } from 'vitest';
import { isRight, right, type Either } from '../../domain/shared/either';
import type { Observable } from '../../domain/shared/observable';
import type { InfrastructureError } from '../../infrastructure/errors';
import type {
  NewOrder,
  Order,
  OrderStage,
} from '../../domain/order/order.entity';
import type { OrderRepository } from '../../domain/order/order.repository';
import {
  makeCancelOrder,
  makeListOrders,
  makeMarkOrderPaid,
  makeObserveActiveOrders,
  makeObserveSessionOrders,
  makeSetOrderStage,
} from './order-management.usecases';

class FakeOrderRepository implements OrderRepository {
  paid: { id: number; method: string } | null = null;
  cancelled: number | null = null;
  staged: { id: number; stage: OrderStage } | null = null;
  observedSession: number | null = null;
  observedActive = false;
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

  observeBySession(sessionId: number): Observable<Order[]> {
    this.observedSession = sessionId;
    return this.stream;
  }

  observeActiveStages(): Observable<Order[]> {
    this.observedActive = true;
    return this.stream;
  }

  async markAsPaid(
    id: number,
    paymentMethod: string,
  ): Promise<Either<InfrastructureError, void>> {
    this.paid = { id, method: paymentMethod };
    return right(undefined);
  }

  async cancel(id: number): Promise<Either<InfrastructureError, void>> {
    this.cancelled = id;
    return right(undefined);
  }

  async setStage(
    id: number,
    stage: OrderStage,
  ): Promise<Either<InfrastructureError, void>> {
    this.staged = { id, stage };
    return right(undefined);
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
    const stream = makeObserveSessionOrders(repo)(7);
    expect(repo.observedSession).toBe(7);
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
    await makeMarkOrderPaid(repo)(3, 'pix');
    expect(repo.paid).toEqual({ id: 3, method: 'pix' });
  });

  it('cancels an order', async () => {
    const repo = new FakeOrderRepository();
    await makeCancelOrder(repo)(5);
    expect(repo.cancelled).toBe(5);
  });

  it('sets an order stage', async () => {
    const repo = new FakeOrderRepository();
    await makeSetOrderStage(repo)(9, 'em_preparo');
    expect(repo.staged).toEqual({ id: 9, stage: 'em_preparo' });
  });

  it('subscribes to the returned observable', () => {
    const repo = new FakeOrderRepository();
    const next = vi.fn();
    const sub = makeObserveActiveOrders(repo)().subscribe(next);
    sub.unsubscribe();
    expect(typeof sub.unsubscribe).toBe('function');
  });
});
