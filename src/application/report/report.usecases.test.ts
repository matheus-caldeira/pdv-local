import { describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import type { Session } from '../../domain/cash/cash.entity';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { CashRepository } from '../../domain/cash/cash.repository';
import type { CashMovement } from '../../domain/cash/cash.entity';
import type { Observable } from '../../domain/shared/observable';
import type { NewOrder } from '../../domain/order/order.entity';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import {
  makeListReportSessions,
  makeLoadDashboard,
  makeLoadSessionReport,
} from './report.usecases';

const item = (over: Partial<OrderItem> = {}): OrderItem => ({
  productId: 1,
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 8,
  qty: 1,
  ...over,
});

const order = (over: Partial<Order> = {}): Order => ({
  id: 1,
  sessionId: 1,
  items: [item()],
  total: 20,
  paymentMethod: 'pix',
  customerName: 'Maria',
  ticket: '0001',
  customerPhone: '',
  stage: 'finalizado',
  status: 'paid',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

class FakeOrderRepository implements OrderRepository {
  listResult: Either<InfrastructureError, Order[]> = right([]);

  async create(o: NewOrder): Promise<Either<InfrastructureError, Order>> {
    return right({ ...o, id: 1 } as Order);
  }
  async listAll(): Promise<Either<InfrastructureError, Order[]>> {
    return right([]);
  }
  async listBySession(): Promise<Either<InfrastructureError, Order[]>> {
    return this.listResult;
  }
  observeBySession(): Observable<Order[]> {
    return { subscribe: () => ({ unsubscribe: () => {} }) };
  }
  observeActiveStages(): Observable<Order[]> {
    return { subscribe: () => ({ unsubscribe: () => {} }) };
  }
  async markAsPaid(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
  async cancel(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
  async setStage(): Promise<Either<InfrastructureError, void>> {
    return right(undefined);
  }
}

class FakeCashRepository implements CashRepository {
  sessionsResult: Either<InfrastructureError, Session[]> = right([]);

  async findOpenSession(): Promise<
    Either<InfrastructureError, Session | undefined>
  > {
    return right(undefined);
  }
  async listSessions(): Promise<Either<InfrastructureError, Session[]>> {
    return this.sessionsResult;
  }
  async openSession(): Promise<Either<InfrastructureError, Session>> {
    return right(null as never);
  }
  async closeSession(): Promise<Either<InfrastructureError, Session>> {
    return right(null as never);
  }
  async listMovements(): Promise<Either<InfrastructureError, CashMovement[]>> {
    return right([]);
  }
  async addMovement(): Promise<Either<InfrastructureError, CashMovement>> {
    return right(null as never);
  }
}

describe('report use cases', () => {
  describe('makeListReportSessions', () => {
    it('returns the sessions from the cash repository', async () => {
      const cash = new FakeCashRepository();
      cash.sessionsResult = right([{ id: 1 } as Session]);
      const result = await makeListReportSessions(cash)();
      expect(isRight(result) && result.right).toHaveLength(1);
    });
  });

  describe('makeLoadSessionReport', () => {
    it('aggregates the session orders into a report', async () => {
      const orders = new FakeOrderRepository();
      orders.listResult = right([
        order({
          total: 100,
          items: [item({ qty: 2, salePrice: 50, costPrice: 20 })],
        }),
        order({ id: 2, status: 'open', total: 30 }),
      ]);
      const result = await makeLoadSessionReport(orders)(1);
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.summary.totalSales).toBe(100);
        expect(result.right.byMethod).toEqual({ pix: 100 });
        expect(result.right.products).toHaveLength(1);
        expect(result.right.pending).toHaveLength(1);
      }
    });

    it('propagates a repository failure', async () => {
      const orders = new FakeOrderRepository();
      orders.listResult = left(new ConnectorError('down'));
      const result = await makeLoadSessionReport(orders)(1);
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeLoadDashboard', () => {
    it('builds dashboard data with top products and recent orders', async () => {
      const orders = new FakeOrderRepository();
      orders.listResult = right([
        order({ id: 1, createdAt: 1, total: 20 }),
        order({ id: 2, createdAt: 3, status: 'open', total: 15 }),
      ]);
      const result = await makeLoadDashboard(orders)(1);
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.summary.paidCount).toBe(1);
        expect(result.right.openCount).toBe(1);
        expect(result.right.recent.map((o) => o.id)).toEqual([2, 1]);
        expect(result.right.topProducts.length).toBeGreaterThan(0);
      }
    });

    it('propagates a repository failure', async () => {
      const orders = new FakeOrderRepository();
      orders.listResult = left(new ConnectorError('down'));
      const result = await makeLoadDashboard(orders)(1);
      expect(isLeft(result)).toBe(true);
    });
  });
});
