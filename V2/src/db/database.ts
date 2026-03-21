import Dexie, { type Table } from 'dexie'

export interface Product {
  id?: number
  name: string
  category: string
  costPrice: number
  salePrice: number
  stock: number
  active: boolean
  createdAt: number
  updatedAt: number
}

export interface OrderItem {
  productId: number
  name: string
  salePrice: number
  costPrice: number
  qty: number
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

  constructor() {
    super('pdv_v2')
    this.version(1).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
    })
  }
}

export const db = new PDVDatabase()
