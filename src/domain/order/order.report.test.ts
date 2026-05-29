import { describe, expect, it } from 'vitest';
import type { Order, OrderItem } from './order.entity';
import {
  pendingOrders,
  productRanking,
  recentOrders,
  salesByMethod,
  summarizeSales,
} from './order.report';

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

describe('summarizeSales', () => {
  it('computes totals, profit and margin for paid orders only', () => {
    const summary = summarizeSales([
      order({
        total: 100,
        items: [item({ qty: 2, salePrice: 50, costPrice: 20 })],
      }),
      order({ status: 'open', total: 999, items: [item()] }),
    ]);
    expect(summary.totalSales).toBe(100);
    expect(summary.totalCost).toBe(40);
    expect(summary.profit).toBe(60);
    expect(summary.margin).toBe(60);
    expect(summary.paidCount).toBe(1);
  });

  it('returns zero margin when there are no sales', () => {
    const summary = summarizeSales([]);
    expect(summary.margin).toBe(0);
    expect(summary.totalSales).toBe(0);
  });
});

describe('salesByMethod', () => {
  it('groups paid totals by method, defaulting null to outros', () => {
    const result = salesByMethod([
      order({ paymentMethod: 'pix', total: 30 }),
      order({ paymentMethod: 'pix', total: 20 }),
      order({ paymentMethod: null, total: 10 }),
      order({ status: 'cancelled', paymentMethod: 'pix', total: 999 }),
    ]);
    expect(result).toEqual({ pix: 50, outros: 10 });
  });
});

describe('productRanking', () => {
  it('ranks products by total accumulating qty and cost', () => {
    const result = productRanking([
      order({
        items: [
          item({ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }),
          item({ name: 'Burger', salePrice: 20, costPrice: 8, qty: 2 }),
        ],
      }),
      order({
        items: [item({ name: 'Refri', salePrice: 5, costPrice: 2, qty: 3 })],
      }),
    ]);
    expect(result.map((p) => p.name)).toEqual(['Burger', 'Refri']);
    expect(result[0]).toEqual({ name: 'Burger', qty: 2, total: 40, cost: 16 });
    expect(result[1]).toEqual({ name: 'Refri', qty: 4, total: 20, cost: 8 });
  });
});

describe('pendingOrders', () => {
  it('keeps only open and pending orders', () => {
    const result = pendingOrders([
      order({ id: 1, status: 'open' }),
      order({ id: 2, status: 'pending' }),
      order({ id: 3, status: 'paid' }),
      order({ id: 4, status: 'cancelled' }),
    ]);
    expect(result.map((o) => o.id)).toEqual([1, 2]);
  });
});

describe('recentOrders', () => {
  it('returns the most recent orders limited by the given count', () => {
    const result = recentOrders(
      [
        order({ id: 1, createdAt: 1 }),
        order({ id: 2, createdAt: 3 }),
        order({ id: 3, createdAt: 2 }),
      ],
      2,
    );
    expect(result.map((o) => o.id)).toEqual([2, 3]);
  });
});
