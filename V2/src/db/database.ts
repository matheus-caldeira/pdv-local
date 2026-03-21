import Dexie, { type Table } from 'dexie'

export interface CustomizationItem {
  id?: number
  groupId: number
  name: string
  price: number
  chargeAfter: number // cobrar preco a partir de X unidades (0 = sempre cobra)
  active: boolean
}

export interface CustomizationGroup {
  id?: number
  name: string
  required: boolean
  minQty: number
  maxQty: number
  chargeAfter: number // cobrar a partir de X selecoes no grupo (0 = sempre cobra)
}

export interface Product {
  id?: number
  name: string
  category: string
  costPrice: number
  salePrice: number
  stock: number
  active: boolean
  customizationGroupIds: number[]
  createdAt: number
  updatedAt: number
}

export interface OrderCustomization {
  groupName: string
  items: { name: string; qty: number; price: number }[]
}

export interface OrderItem {
  productId: number
  name: string
  salePrice: number
  costPrice: number
  qty: number
  observation?: string
  customizations?: OrderCustomization[]
  customizationTotal?: number
}

export interface Order {
  id?: number
  sessionId: number
  items: OrderItem[]
  total: number
  paymentMethod: string | null
  customerName: string
  ticket: string
  status: 'open' | 'paid' | 'pending' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface Session {
  id?: number
  openedAt: number
  closedAt: number | null
  cashInitial: number
  cashFinal: number | null
  notes: string
}

export interface CashMovement {
  id?: number
  sessionId: number
  type: 'sangria' | 'suprimento'
  amount: number
  reason: string
  createdAt: number
}

export interface BusinessConfig {
  id?: number
  name: string
  document: string
  phone: string
  address: string
}

export class PDVDatabase extends Dexie {
  products!: Table<Product>
  orders!: Table<Order>
  sessions!: Table<Session>
  cashMovements!: Table<CashMovement>
  config!: Table<BusinessConfig>
  customizationGroups!: Table<CustomizationGroup>
  customizationItems!: Table<CustomizationItem>

  constructor() {
    super('pdv_v2')
    this.version(1).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
    })
    this.version(2).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
      customizationGroups: '++id, name',
      customizationItems: '++id, groupId, active',
    }).upgrade(tx => {
      return tx.table('products').toCollection().modify(product => {
        if (!product.customizationGroupIds) {
          product.customizationGroupIds = []
        }
      })
    })
  }
}

export const db = new PDVDatabase()
