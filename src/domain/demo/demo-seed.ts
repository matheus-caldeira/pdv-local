import type { BackupSnapshot } from '../backup/backup.repository';
import type { Product } from '../product/product.entity';
import type { Customer } from '../customer/customer.entity';
import type { Session, CashMovement } from '../cash/cash.entity';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../customization/customization.entity';
import type {
  Order,
  OrderCustomizationItem,
  OrderItem,
  OrderStatus,
} from '../order/order.entity';
import {
  calculateCustomizationTotal,
  calculateOrderTotal,
} from '../order/order.rules';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const SESSION_COUNT = 5;
const ORDER_COUNT = 52;
const DEMO_BUSINESS_TYPE_ID = 'quick_sale';

let uidCounter = 0;

function nextUid(prefix: string): string {
  return `${prefix}-${uidCounter++}`;
}

function resetUidCounter(): void {
  uidCounter = 0;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

type ProductSeed = Omit<Product, 'id' | 'uid' | 'createdAt' | 'updatedAt'>;

const PRODUCT_SEED: ProductSeed[] = [
  {
    name: 'X-Burguer',
    category: 'Lanches',
    costPrice: 6.5,
    salePrice: 16,
    stock: 40,
    active: true,
    customizationGroupIds: [1, 2, 3],
  },
  {
    name: 'X-Salada',
    category: 'Lanches',
    costPrice: 7.5,
    salePrice: 18,
    stock: 35,
    active: true,
    customizationGroupIds: [1, 2, 3],
  },
  {
    name: 'X-Bacon',
    category: 'Lanches',
    costPrice: 9,
    salePrice: 22,
    stock: 30,
    active: true,
    customizationGroupIds: [1, 2, 3],
  },
  {
    name: 'X-Tudo',
    category: 'Lanches',
    costPrice: 12,
    salePrice: 28,
    stock: 25,
    active: true,
    customizationGroupIds: [1, 2, 3],
  },
  {
    name: 'Batata Frita Media',
    category: 'Acompanhamentos',
    costPrice: 3,
    salePrice: 10,
    stock: 50,
    active: true,
    customizationGroupIds: [1],
  },
  {
    name: 'Refrigerante Lata',
    category: 'Bebidas',
    costPrice: 2.5,
    salePrice: 6,
    stock: 80,
    active: true,
    customizationGroupIds: [],
  },
  {
    name: 'Suco Natural 500ml',
    category: 'Bebidas',
    costPrice: 3.5,
    salePrice: 9,
    stock: 25,
    active: true,
    customizationGroupIds: [],
  },
  {
    name: 'Milkshake 400ml',
    category: 'Sobremesas',
    costPrice: 5,
    salePrice: 14,
    stock: 20,
    active: true,
    customizationGroupIds: [],
  },
  {
    name: 'Combo X-Bacon',
    category: 'Combos',
    costPrice: 14,
    salePrice: 32,
    stock: 0,
    active: true,
    customizationGroupIds: [1, 2, 3],
  },
];

const GROUP_SEED: Omit<CustomizationGroup, 'id' | 'uid'>[] = [
  { name: 'Consumo', required: true, minQty: 1, maxQty: 1, chargeAfter: 0 },
  {
    name: 'Ponto da carne',
    required: true,
    minQty: 1,
    maxQty: 1,
    chargeAfter: 0,
  },
  { name: 'Adicionais', required: false, minQty: 0, maxQty: 5, chargeAfter: 0 },
];

const ITEM_SEED: { groupId: number; name: string; price: number }[] = [
  { groupId: 1, name: 'No local', price: 0 },
  { groupId: 1, name: 'Viagem', price: 0 },
  { groupId: 1, name: 'Entrega', price: 0 },
  { groupId: 2, name: 'Mal passado', price: 0 },
  { groupId: 2, name: 'Ao ponto', price: 0 },
  { groupId: 2, name: 'Bem passado', price: 0 },
  { groupId: 3, name: 'Bacon extra', price: 4 },
  { groupId: 3, name: 'Queijo extra', price: 3 },
  { groupId: 3, name: 'Ovo', price: 2.5 },
  { groupId: 3, name: 'Cheddar', price: 3.5 },
  { groupId: 3, name: 'Catupiry', price: 3.5 },
];

const CUSTOMER_SEED: { name: string; phone: string }[] = [
  { name: 'Maria Souza', phone: '(11) 97777-0001' },
  { name: 'Joao Lima', phone: '(11) 97777-0002' },
  { name: 'Ana Pereira', phone: '(11) 97777-0003' },
  { name: 'Pedro Alves', phone: '(11) 97777-0004' },
  { name: 'Carla Dias', phone: '(11) 97777-0005' },
  { name: 'Bruno Costa', phone: '(11) 97777-0006' },
  { name: 'Luiza Rocha', phone: '(11) 97777-0007' },
  { name: 'Rafael Gomes', phone: '(11) 97777-0008' },
];

const PAYMENT_METHODS = ['dinheiro', 'pix', 'credito', 'debito'];

function buildProducts(now: number): Product[] {
  return PRODUCT_SEED.map((product, index) => ({
    ...product,
    id: index + 1,
    uid: nextUid('product'),
    createdAt: now - 60 * DAY,
    updatedAt: now - 60 * DAY,
  }));
}

function buildGroups(): CustomizationGroup[] {
  return GROUP_SEED.map((group, index) => ({
    ...group,
    id: index + 1,
    uid: nextUid('group'),
  }));
}

function buildItems(groups: CustomizationGroup[]): CustomizationItem[] {
  return ITEM_SEED.map((item, index) => ({
    id: index + 1,
    uid: nextUid('item'),
    groupUid: groups.find((g) => g.id === item.groupId)!.uid,
    name: item.name,
    price: item.price,
    maxQty: 1,
    chargeAfter: 0,
    active: true,
  }));
}

function buildCustomers(now: number): Customer[] {
  return CUSTOMER_SEED.map((customer, index) => ({
    id: index + 1,
    uid: nextUid('customer'),
    name: customer.name,
    phone: customer.phone,
    addresses: [],
    extra: {},
    createdAt: now - 50 * DAY,
    updatedAt: now - 50 * DAY,
  }));
}

function buildSessions(now: number): Session[] {
  const sessions: Session[] = [];
  for (let index = 0; index < SESSION_COUNT; index++) {
    const daysAgo = (SESSION_COUNT - index) * 6;
    const openedAt = now - daysAgo * DAY + 9 * HOUR;
    const isOpen = index === SESSION_COUNT - 1;
    sessions.push({
      id: index + 1,
      uid: nextUid('session'),
      openedAt,
      closedAt: isOpen ? null : openedAt + 10 * HOUR,
      cashInitial: 200,
      cashFinal: isOpen
        ? null
        : 200 + intBetween(createRng(index + 1), 3, 9) * 50,
      notes: isOpen ? 'Turno atual' : `Turno ${index + 1}`,
    });
  }
  return sessions;
}

function buildItemCustomizations(
  rng: () => number,
  product: Product,
  groups: CustomizationGroup[],
  items: CustomizationItem[],
): { customizations: OrderCustomizationItem[]; total: number } {
  if (product.customizationGroupIds.length === 0) {
    return { customizations: [], total: 0 };
  }
  const customizations: OrderCustomizationItem[] = [];
  const selections = [];
  for (const groupId of product.customizationGroupIds) {
    const group = groups.find((g) => g.id === groupId)!;
    const groupItems = items.filter((i) => i.groupUid === group.uid);
    if (!group.required && rng() < 0.5) continue;
    const chosen = group.required
      ? [pick(rng, groupItems)]
      : groupItems.filter(() => rng() < 0.4);
    if (chosen.length === 0) continue;
    for (const item of chosen) {
      customizations.push({
        groupName: group.name,
        name: item.name,
        qty: 1,
        price: item.price,
      });
    }
    selections.push({
      required: group.required,
      minQty: group.minQty,
      chargeAfter: group.chargeAfter,
      items: chosen.map((item) => ({
        qty: 1,
        price: item.price,
        chargeAfter: item.chargeAfter,
      })),
    });
  }
  return { customizations, total: calculateCustomizationTotal(selections) };
}

function buildOrderItems(
  rng: () => number,
  products: Product[],
  groups: CustomizationGroup[],
  items: CustomizationItem[],
  applyCustomizations: boolean,
): OrderItem[] {
  const lineCount = intBetween(rng, 1, 3);
  const orderItems: OrderItem[] = [];
  for (let line = 0; line < lineCount; line++) {
    const product = pick(rng, products);
    const qty = intBetween(rng, 1, 2);
    const { customizations, total } = applyCustomizations
      ? buildItemCustomizations(rng, product, groups, items)
      : { customizations: [], total: 0 };
    orderItems.push({
      productUid: product.uid,
      name: product.name,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      qty,
      customizations: customizations.length > 0 ? customizations : undefined,
      customizationTotal: total > 0 ? total : undefined,
    });
  }
  return orderItems;
}

function buildOrders(
  products: Product[],
  groups: CustomizationGroup[],
  items: CustomizationItem[],
  customers: Customer[],
  sessions: Session[],
): Order[] {
  const rng = createRng(987654321);
  const orders: Order[] = [];
  const openSession = sessions[sessions.length - 1];
  for (let index = 0; index < ORDER_COUNT; index++) {
    const session = pick(rng, sessions);
    const isOpenSession = session === openSession;
    const statusRoll = rng();
    let status: OrderStatus = 'paid';
    if (isOpenSession && statusRoll < 0.4) status = 'open';
    else if (statusRoll > 0.93) status = 'cancelled';
    const applyCustomizations = rng() < 0.6;
    const orderItems = buildOrderItems(
      rng,
      products,
      groups,
      items,
      applyCustomizations,
    );
    const customer = pick(rng, customers);
    const createdAt = session.openedAt + intBetween(rng, 0, 9) * HOUR;
    orders.push({
      id: index + 1,
      uid: nextUid('order'),
      businessTypeId: DEMO_BUSINESS_TYPE_ID,
      sessionUid: session.uid,
      items: orderItems,
      total: calculateOrderTotal(orderItems),
      paymentMethod: status === 'paid' ? pick(rng, PAYMENT_METHODS) : null,
      customerName: customer.name,
      customerUid: customer.uid,
      customerPhone: customer.phone ?? '',
      ticket: String(index + 1).padStart(4, '0'),
      stage: status === 'open' ? 'em_preparo' : 'finalizado',
      status,
      createdAt,
      updatedAt: createdAt + 20 * 60 * 1000,
    });
  }
  return orders;
}

function buildCashMovements(sessions: Session[]): CashMovement[] {
  const rng = createRng(424242);
  const movements: CashMovement[] = [];
  let id = 1;
  for (const session of sessions) {
    const count = intBetween(rng, 1, 3);
    for (let index = 0; index < count; index++) {
      const isSangria = rng() < 0.5;
      movements.push({
        id: id++,
        uid: nextUid('cash-movement'),
        sessionUid: session.uid,
        type: isSangria ? 'sangria' : 'suprimento',
        amount: intBetween(rng, 1, 4) * 50,
        reason: isSangria ? 'Deposito no cofre' : 'Troco extra',
        createdAt: session.openedAt + (index + 1) * 2 * HOUR,
      });
    }
  }
  return movements;
}

export function generateDemoSeed(now: number): BackupSnapshot {
  resetUidCounter();
  const products = buildProducts(now);
  const groups = buildGroups();
  const items = buildItems(groups);
  const customers = buildCustomers(now);
  const sessions = buildSessions(now);
  const orders = buildOrders(products, groups, items, customers, sessions);
  const cashMovements = buildCashMovements(sessions);

  return {
    config: [
      {
        id: 1,
        name: 'Lanchonete do Balcao',
        document: '12.345.678/0001-90',
        phone: '(11) 98888-1234',
        address: 'Rua das Palmeiras, 120 - Centro',
        ticketCounter: orders.length + 1,
        ticketLimit: 9999,
        ticketAutoReset: true,
        statusControlEnabled: true,
      },
    ],
    products,
    customizationGroups: groups,
    customizationItems: items,
    customers,
    sessions,
    orders,
    cashMovements,
  };
}
