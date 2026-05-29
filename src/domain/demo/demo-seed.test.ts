import { describe, expect, it } from 'vitest';
import { generateDemoSeed } from './demo-seed';
import { calculateOrderTotal } from '../order/order.rules';
import type { Order } from '../order/order.entity';
import type { Product } from '../product/product.entity';
import type { Session } from '../cash/cash.entity';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../customization/customization.entity';

const NOW = new Date('2026-05-28T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('generateDemoSeed', () => {
  it('produces a coherent multi-entity snapshot', () => {
    const seed = generateDemoSeed(NOW);
    expect(seed.config).toHaveLength(1);
    expect((seed.products as Product[]).length).toBeGreaterThanOrEqual(8);
    expect((seed.sessions as Session[]).length).toBe(5);
    expect((seed.orders as Order[]).length).toBeGreaterThanOrEqual(50);
    expect(
      (seed.customizationGroups as CustomizationGroup[]).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      (seed.customizationItems as CustomizationItem[]).length,
    ).toBeGreaterThan(0);
    expect((seed.customers as unknown[]).length).toBeGreaterThan(0);
    expect((seed.cashMovements as unknown[]).length).toBeGreaterThan(0);
  });

  it('includes a required "Consumo" customization group', () => {
    const groups = generateDemoSeed(NOW)
      .customizationGroups as CustomizationGroup[];
    const consumo = groups.find((g) => g.name === 'Consumo');
    expect(consumo).toBeDefined();
    expect(consumo?.required).toBe(true);
  });

  it('keeps every order total consistent with the order rules', () => {
    const orders = generateDemoSeed(NOW).orders as Order[];
    for (const order of orders) {
      expect(order.total).toBe(calculateOrderTotal(order.items));
    }
  });

  it('links orders to existing sessions, products and customers', () => {
    const seed = generateDemoSeed(NOW);
    const sessionIds = new Set((seed.sessions as Session[]).map((s) => s.id));
    const productIds = new Set((seed.products as Product[]).map((p) => p.id));
    const customerIds = new Set(
      (seed.customers as { id: number }[]).map((c) => c.id),
    );
    for (const order of seed.orders as Order[]) {
      expect(sessionIds.has(order.sessionId)).toBe(true);
      expect(customerIds.has(order.customerId as number)).toBe(true);
      for (const item of order.items) {
        expect(productIds.has(item.productId)).toBe(true);
      }
    }
  });

  it('leaves exactly the latest session open', () => {
    const sessions = generateDemoSeed(NOW).sessions as Session[];
    const open = sessions.filter((s) => s.closedAt === null);
    expect(open).toHaveLength(1);
    const openSession = open[0];
    const others = sessions.filter((s) => s !== openSession);
    for (const session of others) {
      expect(session.openedAt).toBeLessThan(openSession.openedAt);
    }
  });

  it('anchors all dates within the last 35 days before now', () => {
    const seed = generateDemoSeed(NOW);
    const sessions = seed.sessions as Session[];
    const orders = seed.orders as Order[];
    for (const session of sessions) {
      expect(session.openedAt).toBeGreaterThanOrEqual(NOW - 35 * DAY);
      expect(session.openedAt).toBeLessThanOrEqual(NOW);
    }
    for (const order of orders) {
      expect(order.createdAt).toBeGreaterThanOrEqual(NOW - 35 * DAY);
      expect(order.createdAt).toBeLessThanOrEqual(NOW);
    }
  });

  it('shifts the date window when now changes', () => {
    const may = generateDemoSeed(NOW).sessions as Session[];
    const december = generateDemoSeed(
      new Date('2026-12-15T12:00:00Z').getTime(),
    ).sessions as Session[];
    const mayMonth = new Date(may[may.length - 1].openedAt).getUTCMonth();
    const decMonth = new Date(
      december[december.length - 1].openedAt,
    ).getUTCMonth();
    expect(mayMonth).not.toBe(decMonth);
  });

  it('is deterministic for the same now', () => {
    expect(generateDemoSeed(NOW)).toEqual(generateDemoSeed(NOW));
  });

  it('applies customizations to some orders and not others', () => {
    const orders = generateDemoSeed(NOW).orders as Order[];
    const withCustom = orders.filter((o) =>
      o.items.some((i) => (i.customizations?.length ?? 0) > 0),
    );
    const withoutCustom = orders.filter((o) =>
      o.items.every((i) => (i.customizations?.length ?? 0) === 0),
    );
    expect(withCustom.length).toBeGreaterThan(0);
    expect(withoutCustom.length).toBeGreaterThan(0);
  });

  it('produces mostly paid orders with a few cancelled and some open', () => {
    const orders = generateDemoSeed(NOW).orders as Order[];
    const paid = orders.filter((o) => o.status === 'paid');
    const cancelled = orders.filter((o) => o.status === 'cancelled');
    const open = orders.filter((o) => o.status === 'open');
    expect(paid.length).toBeGreaterThan(orders.length * 0.6);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(open.length).toBeGreaterThan(0);
  });
});
