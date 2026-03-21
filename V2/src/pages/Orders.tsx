import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { db, type Order } from '../db/database'
import { formatMoney, formatDateTime } from '../utils/format'
import { Modal } from '../components/Modal'
import { useToast } from '../components/Toast'
import './Orders.css'

const STATUS_OPTIONS = [
  { key: '', label: 'Todos' },
  { key: 'open', label: 'Abertos' },
  { key: 'paid', label: 'Pagos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'cancelled', label: 'Cancelados' },
]

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX', credito: 'Credito', debito: 'Debito',
  dinheiro: 'Dinheiro', pagar_depois: 'Pagar Depois',
}

export function Orders() {
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  useEffect(() => { loadOrders() }, [])

  async function loadOrders() {
    const all = await db.orders.toArray()
    setOrders(all.sort((a, b) => b.createdAt - a.createdAt))
  }

  async function markAsPaid(order: Order, method: string) {
    await db.orders.update(order.id!, {
      status: 'paid',
      paymentMethod: method,
      updatedAt: Date.now(),
    })
    toast('Pedido marcado como pago')
    setDetailOrder(null)
    loadOrders()
  }

  async function cancelOrder(order: Order) {
    if (!confirm('Cancelar este pedido?')) return
    await db.orders.update(order.id!, {
      status: 'cancelled',
      updatedAt: Date.now(),
    })
    toast('Pedido cancelado')
    setDetailOrder(null)
    loadOrders()
  }

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return o.ticket.includes(q) || o.customerName.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Pedidos</h1>
        <span className="order-count">{filtered.length} pedidos</span>
      </div>

      <div className="orders-filters">
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por comanda ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="status-pills">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`cat-pill ${statusFilter === opt.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-hint" style={{ padding: 'var(--space-10) 0' }}>
          Nenhum pedido encontrado
        </div>
      ) : (
        <div className="order-list">
          {filtered.map(o => (
            <div key={o.id} className="order-row" onClick={() => setDetailOrder(o)}>
              <div className="order-row-top">
                <div>
                  <span className="order-ticket">#{o.ticket}</span>
                  {o.customerName && <span className="order-customer">{o.customerName}</span>}
                </div>
                <span className="order-total tabular">{formatMoney(o.total)}</span>
              </div>
              <div className="order-row-bottom">
                <div className="order-row-meta">
                  <span className={`status-badge status-${o.status}`}>{statusLabel(o.status)}</span>
                  <span className="order-payment">{PAYMENT_LABELS[o.paymentMethod || ''] || '-'}</span>
                  <span>{o.items.length} {o.items.length === 1 ? 'item' : 'itens'}</span>
                </div>
                <span className="order-date">{formatDateTime(o.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      <Modal
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={`Pedido #${detailOrder?.ticket || ''}`}
      >
        {detailOrder && (
          <div className="order-detail">
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`status-badge status-${detailOrder.status}`}>
                {statusLabel(detailOrder.status)}
              </span>
            </div>
            {detailOrder.customerName && (
              <div className="detail-row">
                <span className="detail-label">Cliente</span>
                <span>{detailOrder.customerName}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Pagamento</span>
              <span>{PAYMENT_LABELS[detailOrder.paymentMethod || ''] || 'Nenhum'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Data</span>
              <span>{formatDateTime(detailOrder.createdAt)}</span>
            </div>

            <div className="detail-items-title">Itens</div>
            {detailOrder.items.map((item, i) => (
              <div key={i} className="detail-item">
                <span>{item.qty}x {item.name}</span>
                <span className="tabular">{formatMoney(item.salePrice * item.qty)}</span>
              </div>
            ))}
            <div className="detail-total">
              <span>Total</span>
              <span className="tabular">{formatMoney(detailOrder.total)}</span>
            </div>

            {(detailOrder.status === 'open' || detailOrder.status === 'pending') && (
              <div className="detail-actions">
                <button className="btn btn-accent btn-full" onClick={() => markAsPaid(detailOrder, 'dinheiro')}>
                  Marcar como Pago
                </button>
                <button className="btn btn-outline btn-full" onClick={() => cancelOrder(detailOrder)}>
                  Cancelar Pedido
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function statusLabel(status: string) {
  switch (status) {
    case 'open': return 'Aberto'
    case 'paid': return 'Pago'
    case 'pending': return 'Pendente'
    case 'cancelled': return 'Cancelado'
    default: return status
  }
}
