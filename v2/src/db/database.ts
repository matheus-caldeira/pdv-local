import Dexie, { type Table } from 'dexie'
import { formatTicket, nextTicketCounter } from '../utils/format'

export interface CustomizationItem {
  id?: number
  groupId: number
  name: string
  price: number
  maxQty: number // max por item (0 = sem limite, usa o do grupo)
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
  ticketCounter: number // proximo numero de comanda a usar
  ticketLimit: number // limite do reset automatico (define os digitos da comanda)
  ticketAutoReset: boolean // reinicia a sequencia ao passar do limite
}

// Defaults da sequencia de comandas, aplicados a configs sem esses campos.
export const TICKET_DEFAULTS = {
  ticketCounter: 1,
  ticketLimit: 9999,
  ticketAutoReset: true,
} as const

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
    this.version(3).stores({
      products: '++id, name, category, active',
      orders: '++id, sessionId, status, paymentMethod, createdAt',
      sessions: '++id, openedAt, closedAt',
      cashMovements: '++id, sessionId, type',
      config: '++id',
      customizationGroups: '++id, name',
      customizationItems: '++id, groupId, active',
    }).upgrade(async tx => {
      // Consolida o config num registro unico (id fixo) com os defaults da
      // sequencia de comandas. Versoes antigas usavam ++id autoincrement,
      // entao pode haver 0, 1 ou mais registros.
      const table = tx.table('config')
      const all = await table.toArray()
      const merged = {
        name: '', document: '', phone: '', address: '',
        ...TICKET_DEFAULTS,
        ...(all[0] ?? {}),
        id: 1,
      }
      await table.clear()
      await table.put(merged)
    })
  }
}

export const db = new PDVDatabase()

// O config do negocio e um registro unico, sempre com id fixo. Centralizar o
// acesso aqui evita registros duplicados por condicao de corrida.
export const CONFIG_ID = 1

// Le o config, preenchendo defaults para campos ausentes. Nunca grava.
export async function getConfig(): Promise<BusinessConfig> {
  const stored = await db.config.get(CONFIG_ID)
  return {
    id: CONFIG_ID,
    name: '', document: '', phone: '', address: '',
    ...TICKET_DEFAULTS,
    ...stored,
  }
}

// Grava o config de forma idempotente (mescla com o atual). `put` no id fixo
// cria ou substitui, garantindo um unico registro.
export async function saveConfig(patch: Partial<BusinessConfig>): Promise<void> {
  const current = await getConfig()
  await db.config.put({ ...current, ...patch, id: CONFIG_ID })
}

// Reserva a proxima comanda: le o numero atual e avanca o contador numa unica
// transacao, de forma que chamadas concorrentes nunca recebam o mesmo numero.
// Retorna a comanda ja formatada com zeros a esquerda.
export async function claimTicket(): Promise<string> {
  return db.transaction('rw', db.config, async () => {
    const current = await getConfig()
    await db.config.put({
      ...current,
      ticketCounter: nextTicketCounter(
        current.ticketCounter, current.ticketLimit, current.ticketAutoReset,
      ),
      id: CONFIG_ID,
    })
    return formatTicket(current.ticketCounter, current.ticketLimit)
  })
}
