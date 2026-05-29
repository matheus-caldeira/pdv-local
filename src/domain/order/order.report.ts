import type { Order } from './order.entity';

export interface SalesSummary {
  totalSales: number;
  totalCost: number;
  profit: number;
  margin: number;
  paidCount: number;
}

export interface ProductRankingEntry {
  name: string;
  qty: number;
  total: number;
  cost: number;
}

function paidOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === 'paid');
}

function orderCost(order: Order): number {
  return order.items.reduce(
    (cost, item) => cost + item.costPrice * item.qty,
    0,
  );
}

export function summarizeSales(orders: Order[]): SalesSummary {
  const paid = paidOrders(orders);
  const totalSales = paid.reduce((sum, order) => sum + order.total, 0);
  const totalCost = paid.reduce((sum, order) => sum + orderCost(order), 0);
  const profit = totalSales - totalCost;
  const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
  return {
    totalSales,
    totalCost,
    profit,
    margin,
    paidCount: paid.length,
  };
}

export function salesByMethod(orders: Order[]): Record<string, number> {
  const byMethod: Record<string, number> = {};
  for (const order of paidOrders(orders)) {
    const method = order.paymentMethod ?? 'outros';
    byMethod[method] = (byMethod[method] ?? 0) + order.total;
  }
  return byMethod;
}

export function productRanking(orders: Order[]): ProductRankingEntry[] {
  const byProduct = new Map<string, ProductRankingEntry>();
  for (const order of paidOrders(orders)) {
    for (const item of order.items) {
      const entry = byProduct.get(item.name) ?? {
        name: item.name,
        qty: 0,
        total: 0,
        cost: 0,
      };
      entry.qty += item.qty;
      entry.total += item.salePrice * item.qty;
      entry.cost += item.costPrice * item.qty;
      byProduct.set(item.name, entry);
    }
  }
  return [...byProduct.values()].sort((a, b) => b.total - a.total);
}

export function pendingOrders(orders: Order[]): Order[] {
  return orders.filter(
    (order) => order.status === 'open' || order.status === 'pending',
  );
}

export function recentOrders(orders: Order[], limit: number): Order[] {
  return [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
