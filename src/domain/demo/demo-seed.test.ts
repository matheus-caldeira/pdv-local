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
    const sessionUids = new Set((seed.sessions as Session[]).map((s) => s.uid));
    const productUids = new Set((seed.products as Product[]).map((p) => p.uid));
    const customerUids = new Set(
      (seed.customers as { uid: string }[]).map((c) => c.uid),
    );
    for (const order of seed.orders as Order[]) {
      expect(sessionUids.has(order.sessionUid)).toBe(true);
      expect(customerUids.has(order.customerUid as string)).toBe(true);
      for (const item of order.items) {
        expect(productUids.has(item.productUid as string)).toBe(true);
      }
    }
  });

  it('assigns a truthy uid and businessTypeId to every order', () => {
    const orders = generateDemoSeed(NOW).orders as Order[];
    expect(orders.length).toBeGreaterThan(0);
    for (const order of orders) {
      expect(order.uid).toBeTruthy();
      expect(order.sessionUid).toBeTruthy();
      expect(order.businessTypeId).toBeTruthy();
    }
  });

  it('defaults customerPhone to an empty string for customers without a phone', () => {
    const seed = generateDemoSeed(NOW);
    const customers = seed.customers as { uid: string; phone?: string }[];
    const phoneless = customers.filter((c) => !c.phone);
    expect(phoneless.length).toBeGreaterThan(0);
    const phonelessUids = new Set(phoneless.map((c) => c.uid));
    const orders = seed.orders as Order[];
    const ordersForPhoneless = orders.filter((o) =>
      phonelessUids.has(o.customerUid as string),
    );
    expect(ordersForPhoneless.length).toBeGreaterThan(0);
    for (const order of ordersForPhoneless) {
      expect(order.customerPhone).toBe('');
    }
  });

  it('flattens customizations without an OrderCustomization wrapper', () => {
    const orders = generateDemoSeed(NOW).orders as Order[];
    const customizedItems = orders
      .flatMap((order) => order.items)
      .filter((item) => (item.customizations?.length ?? 0) > 0);
    expect(customizedItems.length).toBeGreaterThan(0);
    for (const item of customizedItems) {
      for (const customization of item.customizations ?? []) {
        expect(customization).not.toHaveProperty('items');
        expect(typeof customization.groupName).toBe('string');
        expect(typeof customization.name).toBe('string');
        expect(typeof customization.qty).toBe('number');
        expect(typeof customization.price).toBe('number');
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
