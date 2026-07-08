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
    this.version(5)
      .stores({
        products: '++id, &uid, name, category, active',
        orders:
          '++id, &uid, sessionUid, status, paymentMethod, createdAt, stage',
        sessions: '++id, &uid, openedAt, closedAt',
        cashMovements: '++id, &uid, sessionUid, type',
        config: '++id',
        customizationGroups: '++id, &uid, name',
        customizationItems: '++id, &uid, groupUid, active',
        customers: '++id, &uid, phone, name',
      })
      .upgrade(async (tx) => {
        const assignUid = async (
          tableName: string,
        ): Promise<Map<number, string>> => {
          const table = tx.table(tableName);
          const map = new Map<number, string>();
          await table.toCollection().modify((record) => {
            if (!record.uid) record.uid = crypto.randomUUID();
            map.set(record.id, record.uid);
          });
          return map;
        };

        const sessionMap = await assignUid('sessions');
        const customerMap = await assignUid('customers');
        const productMap = await assignUid('products');
        const groupMap = await assignUid('customizationGroups');
        await assignUid('customizationItems');
        await assignUid('orders');
        await assignUid('cashMovements');

        await tx
          .table('customizationItems')
          .toCollection()
          .modify((item) => {
            if (item.groupId != null) {
              item.groupUid = groupMap.get(item.groupId);
            }
            delete item.groupId;
          });

        await tx
          .table('orders')
          .toCollection()
          .modify((order) => {
            if (order.sessionId != null) {
              order.sessionUid = sessionMap.get(order.sessionId);
            }
            delete order.sessionId;

            if (order.customerId != null) {
              order.customerUid = customerMap.get(order.customerId);
            }
            delete order.customerId;

            if (Array.isArray(order.items)) {
              order.items = order.items.map((item: Record<string, unknown>) => {
                const next: Record<string, unknown> = { ...item };
                if (next.productId != null) {
                  next.productUid = productMap.get(next.productId as number);
                }
                delete next.productId;

                if (Array.isArray(next.customizations)) {
                  next.customizations = next.customizations.flatMap(
                    (group: Record<string, unknown>) => {
                      const groupName = group.groupName;
                      const nested = group.items;
                      if (Array.isArray(nested)) {
                        return nested.map((entry: Record<string, unknown>) => ({
                          groupName,
                          name: entry.name,
                          qty: entry.qty,
                          price: entry.price,
                        }));
                      }
                      return [group];
                    },
                  );
                }

                return next;
              });
            }
          });

        await tx
          .table('cashMovements')
          .toCollection()
          .modify((movement) => {
            if (movement.sessionId != null) {
              movement.sessionUid = sessionMap.get(movement.sessionId);
            }
            delete movement.sessionId;
          });

        await tx
          .table('config')
          .toCollection()
          .modify((config) => {
            if (config.businessTypeId == null) config.businessTypeId = '';
            if (config.extra == null) config.extra = {};
          });
      });
  }
}
