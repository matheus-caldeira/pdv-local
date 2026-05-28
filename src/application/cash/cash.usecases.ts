import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import {
  NoOpenSessionError,
  SessionAlreadyOpenError,
} from '../../domain/errors';
import type { CashMovement, Session } from '../../domain/cash/cash.entity';
import type { CashRepository } from '../../domain/cash/cash.repository';
import type { OrderRepository } from '../../domain/order/order.repository';
import {
  buildCashMovement,
  calculateExpectedCash,
  normalizeCashInitial,
  type CashMovementInput,
} from '../../domain/cash/cash.rules';

export interface CashSummary {
  session: Session | null;
  movements: CashMovement[];
  salesByMethod: Record<string, number>;
  cashSales: number;
  expectedCash: number;
  pastSessions: Session[];
}

export function makeLoadCashSummary(
  cash: CashRepository,
  orders: OrderRepository,
) {
  return async (): Promise<Either<AppError, CashSummary>> => {
    const sessions = await cash.listSessions();
    if (isLeft(sessions)) return sessions;

    const session =
      sessions.right.find((current) => current.closedAt === null) ?? null;
    const pastSessions = sessions.right
      .filter((current) => current.closedAt !== null)
      .sort((a, b) => b.openedAt - a.openedAt);

    if (!session?.id) {
      return right({
        session: null,
        movements: [],
        salesByMethod: {},
        cashSales: 0,
        expectedCash: 0,
        pastSessions,
      });
    }

    const movements = await cash.listMovements(session.id);
    if (isLeft(movements)) return movements;

    const sessionOrders = await orders.listBySession(session.id);
    if (isLeft(sessionOrders)) return sessionOrders;

    const salesByMethod: Record<string, number> = {};
    for (const order of sessionOrders.right) {
      if (order.status !== 'paid') continue;
      const method = order.paymentMethod ?? 'outros';
      salesByMethod[method] = (salesByMethod[method] ?? 0) + order.total;
    }

    const cashSales = salesByMethod.dinheiro ?? 0;
    const expectedCash = calculateExpectedCash({
      cashInitial: session.cashInitial,
      cashSales,
      movements: movements.right,
    });

    return right({
      session,
      movements: movements.right,
      salesByMethod,
      cashSales,
      expectedCash,
      pastSessions,
    });
  };
}

export function makeOpenSession(cash: CashRepository) {
  return async (cashInitial: number): Promise<Either<AppError, Session>> => {
    const amount = normalizeCashInitial(cashInitial);
    if (isLeft(amount)) return amount;

    const open = await cash.findOpenSession();
    if (isLeft(open)) return open;
    if (open.right) return left(new SessionAlreadyOpenError());

    return cash.openSession(amount.right);
  };
}

export function makeCloseSession(cash: CashRepository) {
  return async (
    cashFinal: number,
    notes: string,
  ): Promise<Either<AppError, Session>> => {
    const amount = normalizeCashInitial(cashFinal);
    if (isLeft(amount)) return amount;

    const open = await cash.findOpenSession();
    if (isLeft(open)) return open;
    if (!open.right?.id) {
      return left(new NoOpenSessionError());
    }

    return cash.closeSession(open.right.id, amount.right, notes.trim());
  };
}

export function makeAddCashMovement(cash: CashRepository) {
  return async (
    input: CashMovementInput,
  ): Promise<Either<AppError, CashMovement>> => {
    const built = buildCashMovement(input);
    if (isLeft(built)) return built;

    const open = await cash.findOpenSession();
    if (isLeft(open)) return open;
    if (!open.right?.id) {
      return left(new NoOpenSessionError());
    }

    return cash.addMovement({
      sessionId: open.right.id,
      type: built.right.type,
      amount: built.right.amount,
      reason: built.right.reason,
      createdAt: Date.now(),
    });
  };
}
