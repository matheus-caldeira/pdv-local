import { beforeEach, describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import {
  InvalidCashAmountError,
  InvalidCashMovementError,
  NoOpenSessionError,
  SessionAlreadyOpenError,
} from '../../domain/errors';
import type {
  CashMovement,
  NewCashMovement,
  Session,
} from '../../domain/cash/cash.entity';
import type { CashRepository } from '../../domain/cash/cash.repository';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { NewOrder, Order } from '../../domain/order/order.entity';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import {
  makeAddCashMovement,
  makeCloseSession,
  makeLoadCashSummary,
  makeOpenSession,
} from './cash.usecases';

class FakeCashRepository implements CashRepository {
  sessions: Session[] = [];
  movements: CashMovement[] = [];
  private nextSessionId = 1;
  private nextMovementId = 1;

  openSessionResult: Either<InfrastructureError, Session> | null = null;
  closeSessionResult: Either<InfrastructureError, Session> | null = null;
  addMovementResult: Either<InfrastructureError, CashMovement> | null = null;
  listSessionsResult: Either<InfrastructureError, Session[]> | null = null;
  findOpenSessionResult: Either<
    InfrastructureError,
    Session | undefined
  > | null = null;
  listMovementsResult: Either<InfrastructureError, CashMovement[]> | null =
    null;

  async findOpenSession(): Promise<
    Either<InfrastructureError, Session | undefined>
  > {
    if (this.findOpenSessionResult) return this.findOpenSessionResult;
    return right(this.sessions.find((s) => s.closedAt === null));
  }

  async listSessions(): Promise<Either<InfrastructureError, Session[]>> {
    return this.listSessionsResult ?? right(this.sessions);
  }

  async openSession(
    cashInitial: number,
  ): Promise<Either<InfrastructureError, Session>> {
    if (this.openSessionResult) return this.openSessionResult;
    const session: Session = {
      id: this.nextSessionId++,
      openedAt: 1,
      closedAt: null,
      cashInitial,
      cashFinal: null,
      notes: '',
    };
    this.sessions.push(session);
    return right(session);
  }

  async closeSession(
    id: number,
    cashFinal: number,
    notes: string,
  ): Promise<Either<InfrastructureError, Session>> {
    if (this.closeSessionResult) return this.closeSessionResult;
    const session = this.sessions.find((s) => s.id === id)!;
    session.closedAt = 2;
    session.cashFinal = cashFinal;
    session.notes = notes;
    return right(session);
  }

  async listMovements(
    sessionId: number,
  ): Promise<Either<InfrastructureError, CashMovement[]>> {
    if (this.listMovementsResult) return this.listMovementsResult;
    return right(this.movements.filter((m) => m.sessionId === sessionId));
  }

  async addMovement(
    movement: NewCashMovement,
  ): Promise<Either<InfrastructureError, CashMovement>> {
    if (this.addMovementResult) return this.addMovementResult;
    const stored: CashMovement = { ...movement, id: this.nextMovementId++ };
    this.movements.push(stored);
    return right(stored);
  }
}

class FakeOrderRepository implements OrderRepository {
  orders: Order[] = [];
  listResult: Either<InfrastructureError, Order[]> | null = null;

  async create(order: NewOrder): Promise<Either<InfrastructureError, Order>> {
    const stored = { ...order, id: 1 } as Order;
    this.orders.push(stored);
    return right(stored);
  }

  async listBySession(
    sessionId: number,
  ): Promise<Either<InfrastructureError, Order[]>> {
    if (this.listResult) return this.listResult;
    return right(this.orders.filter((o) => o.sessionId === sessionId));
  }
}

const order = (over: Partial<Order> = {}): Order => ({
  id: 1,
  sessionId: 1,
  items: [],
  total: 100,
  paymentMethod: 'dinheiro',
  customerName: 'Maria',
  ticket: '0001',
  customerPhone: '',
  stage: 'finalizado',
  status: 'paid',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('cash use cases', () => {
  let cash: FakeCashRepository;
  let orders: FakeOrderRepository;

  beforeEach(() => {
    cash = new FakeCashRepository();
    orders = new FakeOrderRepository();
  });

  describe('makeOpenSession', () => {
    it('opens a session with the initial cash', async () => {
      const result = await makeOpenSession(cash)(150);
      expect(isRight(result) && result.right.cashInitial).toBe(150);
      expect(cash.sessions).toHaveLength(1);
    });

    it('rejects an invalid amount before touching the repository', async () => {
      const result = await makeOpenSession(cash)(-5);
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left).toBeInstanceOf(InvalidCashAmountError);
      }
      expect(cash.sessions).toHaveLength(0);
    });

    it('refuses to open a second session', async () => {
      await makeOpenSession(cash)(10);
      const result = await makeOpenSession(cash)(20);
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left).toBeInstanceOf(SessionAlreadyOpenError);
      }
    });

    it('propagates a failure when checking the open session', async () => {
      cash.findOpenSessionResult = left(new ConnectorError('down'));
      const result = await makeOpenSession(cash)(10);
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeCloseSession', () => {
    it('closes the open session', async () => {
      await makeOpenSession(cash)(100);
      const result = await makeCloseSession(cash)(120, '  ok  ');
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.cashFinal).toBe(120);
        expect(result.right.notes).toBe('ok');
      }
    });

    it('rejects an invalid amount', async () => {
      const result = await makeCloseSession(cash)(-1, '');
      expect(isLeft(result) && result.left).toBeInstanceOf(
        InvalidCashAmountError,
      );
    });

    it('fails when there is no open session', async () => {
      const result = await makeCloseSession(cash)(50, '');
      expect(isLeft(result)).toBe(true);
      if (isLeft(result)) {
        expect(result.left).toBeInstanceOf(NoOpenSessionError);
      }
    });

    it('propagates a failure when checking the open session', async () => {
      cash.findOpenSessionResult = left(new ConnectorError('down'));
      const result = await makeCloseSession(cash)(50, '');
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeAddCashMovement', () => {
    it('adds a movement to the open session', async () => {
      await makeOpenSession(cash)(100);
      const result = await makeAddCashMovement(cash)({
        type: 'sangria',
        amount: 30,
        reason: 'troco',
      });
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.sessionId).toBe(1);
        expect(result.right.amount).toBe(30);
      }
    });

    it('rejects an invalid movement before touching the repository', async () => {
      await makeOpenSession(cash)(100);
      const result = await makeAddCashMovement(cash)({
        type: 'sangria',
        amount: 0,
        reason: '',
      });
      expect(isLeft(result) && result.left).toBeInstanceOf(
        InvalidCashMovementError,
      );
      expect(cash.movements).toHaveLength(0);
    });

    it('fails when there is no open session', async () => {
      const result = await makeAddCashMovement(cash)({
        type: 'suprimento',
        amount: 10,
        reason: '',
      });
      expect(isLeft(result) && result.left).toBeInstanceOf(NoOpenSessionError);
    });

    it('propagates a failure when checking the open session', async () => {
      cash.findOpenSessionResult = left(new ConnectorError('down'));
      const result = await makeAddCashMovement(cash)({
        type: 'suprimento',
        amount: 10,
        reason: '',
      });
      expect(isLeft(result)).toBe(true);
    });
  });

  describe('makeLoadCashSummary', () => {
    it('returns an empty summary with past sessions sorted by recency when none is open', async () => {
      cash.sessions = [
        {
          id: 1,
          openedAt: 1,
          closedAt: 5,
          cashInitial: 0,
          cashFinal: 0,
          notes: '',
        },
        {
          id: 2,
          openedAt: 10,
          closedAt: 20,
          cashInitial: 0,
          cashFinal: 0,
          notes: '',
        },
      ];
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.session).toBeNull();
        expect(result.right.pastSessions.map((s) => s.id)).toEqual([2, 1]);
        expect(result.right.expectedCash).toBe(0);
      }
    });

    it('aggregates sales by method and computes the expected cash', async () => {
      await makeOpenSession(cash)(100);
      cash.movements = [
        {
          id: 1,
          sessionId: 1,
          type: 'suprimento',
          amount: 50,
          reason: '',
          createdAt: 0,
        },
        {
          id: 2,
          sessionId: 1,
          type: 'sangria',
          amount: 20,
          reason: '',
          createdAt: 0,
        },
      ];
      orders.orders = [
        order({ id: 1, paymentMethod: 'dinheiro', total: 80 }),
        order({ id: 2, paymentMethod: 'pix', total: 40 }),
        order({ id: 3, paymentMethod: null, total: 10 }),
        order({ id: 4, paymentMethod: 'dinheiro', total: 30, status: 'open' }),
      ];
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.salesByMethod).toEqual({
          dinheiro: 80,
          pix: 40,
          outros: 10,
        });
        expect(result.right.cashSales).toBe(80);
        expect(result.right.expectedCash).toBe(100 + 80 + 50 - 20);
      }
    });

    it('reports zero cash sales when no order was paid in cash', async () => {
      await makeOpenSession(cash)(100);
      orders.orders = [order({ id: 1, paymentMethod: 'pix', total: 40 })];
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isRight(result)).toBe(true);
      if (isRight(result)) {
        expect(result.right.cashSales).toBe(0);
        expect(result.right.expectedCash).toBe(100);
      }
    });

    it('propagates a failure listing sessions', async () => {
      cash.listSessionsResult = left(new ConnectorError('down'));
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isLeft(result)).toBe(true);
    });

    it('propagates a failure listing movements', async () => {
      await makeOpenSession(cash)(100);
      cash.listMovementsResult = left(new ConnectorError('down'));
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isLeft(result)).toBe(true);
    });

    it('propagates a failure listing orders', async () => {
      await makeOpenSession(cash)(100);
      orders.listResult = left(new ConnectorError('down'));
      const result = await makeLoadCashSummary(cash, orders)();
      expect(isLeft(result)).toBe(true);
    });
  });
});
