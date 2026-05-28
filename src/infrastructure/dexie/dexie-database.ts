import Dexie, { type Table } from 'dexie';
import type { Product } from '../../domain/product/product.entity';
import type { Order } from '../../domain/order/order.entity';
import type { Customer } from '../../domain/customer/customer.entity';
import type { BusinessConfig } from '../../domain/config/config.entity';

export interface CustomizationItem {
  id?: number;
  groupId: number;
  name: string;
  price: number;
  maxQty: number;
  chargeAfter: number;
  active: boolean;
}

export interface CustomizationGroup {
  id?: number;
  name: string;
  required: boolean;
  minQty: number;
  maxQty: number;
  chargeAfter: number;
}

export interface Session {
  id?: number;
  openedAt: number;
  closedAt: number | null;
  cashInitial: number;
  cashFinal: number | null;
  notes: string;
}

export interface CashMovement {
  id?: number;
  sessionId: number;
  type: 'sangria' | 'suprimento';
  amount: number;
  reason: string;
  createdAt: number;
}

export const TICKET_DEFAULTS = {
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
} as const;

export const ORDER_DEFAULTS = {
  statusControlEnabled: false,
} as const;

export const CONFIG_ID = 1;

export class PDVDatabase extends Dexie {
  products!: Table<Product>;
  orders!: Table<Order>;
  sessions!: Table<Session>;
  cashMovements!: Table<CashMovement>;
  config!: Table<BusinessConfig>;
  customizationGroups!: Table<CustomizationGroup>;
  customizationItems!: Table<CustomizationItem>;
  customers!: Table<Customer>;

  constructor() {
    super('pdv_v2');
    this.version(1).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
    });
    this.version(2)
      .stores({
        products: '++id, name, category, active',
        orders: '++id, sessionId, status, paymentMethod, createdAt',
        sessions: '++id, openedAt, closedAt',
        cashMovements: '++id, sessionId, type',
        config: '++id',
        customizationGroups: '++id, name',
        customizationItems: '++id, groupId, active',
      })
      .upgrade((tx) => {
        return tx
          .table('products')
          .toCollection()
          .modify((product) => {
            if (!product.customizationGroupIds) {
              product.customizationGroupIds = [];
            }
          });
      });
    this.version(3)
      .stores({
        products: '++id, name, category, active',
        orders: '++id, sessionId, status, paymentMethod, createdAt',
        sessions: '++id, openedAt, closedAt',
        cashMovements: '++id, sessionId, type',
        config: '++id',
        customizationGroups: '++id, name',
        customizationItems: '++id, groupId, active',
      })
      .upgrade(async (tx) => {
        const table = tx.table('config');
        const all = await table.toArray();
        const merged = {
          name: '',
          document: '',
          phone: '',
          address: '',
          ...TICKET_DEFAULTS,
          ...ORDER_DEFAULTS,
          ...(all[0] ?? {}),
          id: 1,
        };
        await table.clear();
        await table.put(merged);
      });
    this.version(4)
      .stores({
        products: '++id, name, category, active',
        orders: '++id, sessionId, status, paymentMethod, createdAt, stage',
        sessions: '++id, openedAt, closedAt',
        cashMovements: '++id, sessionId, type',
        config: '++id',
        customizationGroups: '++id, name',
        customizationItems: '++id, groupId, active',
        customers: '++id, &phone, name',
      })
      .upgrade(async (tx) => {
        await tx
          .table('orders')
          .toCollection()
          .modify((order) => {
            if (order.stage == null) order.stage = 'finalizado';
            if (order.customerPhone == null) order.customerPhone = '';
          });
      });
  }
}
