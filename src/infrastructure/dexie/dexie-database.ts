import Dexie, { type Table } from 'dexie';
import type { Product } from '../../domain/product/product.entity';
import type { Order } from '../../domain/order/order.entity';
import type { Customer } from '../../domain/customer/customer.entity';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';
import type { Session, CashMovement } from '../../domain/cash/cash.entity';

export type {
  CustomizationGroup,
  CustomizationItem,
} from '../../domain/customization/customization.entity';

export type { Session, CashMovement } from '../../domain/cash/cash.entity';

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
