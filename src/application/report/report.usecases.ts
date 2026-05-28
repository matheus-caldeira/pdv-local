import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Order } from '../../domain/order/order.entity';
import type { Session } from '../../domain/cash/cash.entity';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { CashRepository } from '../../domain/cash/cash.repository';
import {
  pendingOrders,
  productRanking,
  recentOrders,
  salesByMethod,
  summarizeSales,
  type ProductRankingEntry,
  type SalesSummary,
} from '../../domain/order/order.report';

export interface SessionReport {
  summary: SalesSummary;
  byMethod: Record<string, number>;
  products: ProductRankingEntry[];
  pending: Order[];
}

export interface DashboardData {
  summary: SalesSummary;
  openCount: number;
  topProducts: ProductRankingEntry[];
  recent: Order[];
}

const TOP_PRODUCTS_LIMIT = 5;
const RECENT_ORDERS_LIMIT = 5;

export function makeListReportSessions(cash: CashRepository) {
  return (): Promise<Either<AppError, Session[]>> => cash.listSessions();
}

export function makeLoadSessionReport(orders: OrderRepository) {
  return async (
    sessionId: number,
  ): Promise<Either<AppError, SessionReport>> => {
    const result = await orders.listBySession(sessionId);
    if (isLeft(result)) return result;
    const list = result.right;
    return right({
      summary: summarizeSales(list),
      byMethod: salesByMethod(list),
      products: productRanking(list),
      pending: pendingOrders(list),
    });
  };
}

export function makeLoadDashboard(orders: OrderRepository) {
  return async (
    sessionId: number,
  ): Promise<Either<AppError, DashboardData>> => {
    const result = await orders.listBySession(sessionId);
    if (isLeft(result)) return result;
    const list = result.right;
    return right({
      summary: summarizeSales(list),
      openCount: pendingOrders(list).length,
      topProducts: productRanking(list).slice(0, TOP_PRODUCTS_LIMIT),
      recent: recentOrders(list, RECENT_ORDERS_LIMIT),
    });
  };
}
