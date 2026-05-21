import { useState, useEffect } from 'react'
import { Search, Printer } from 'lucide-react'
import { db, getConfig, type Order } from '../db/database'
import { formatMoney, formatDateTime } from '../utils/format'
import { STAGE_LABELS } from '../utils/order'
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
  const [payMethodModal, setPayMethodModal] = useState(false)
  const [statusControl, setStatusControl] = useState(false)

  useEffect(() => {
    loadOrders()
    getConfig().then(c => setStatusControl(c.statusControlEnabled))
  }, [])

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
    setPayMethodModal(false)
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

  function handlePrint() {
    toast('Configure a impressora em Config > Impressora (ESC/POS)', 'info')
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
                  {statusControl && (
                    <span className="status-badge">{STAGE_LABELS[o.stage]}</span>
                  )}
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
            {/* Header info */}
            <div className="detail-header-card">
              <div className="detail-header-row">
                <span className={`status-badge status-${detailOrder.status}`}>
                  {statusLabel(detailOrder.status)}
                </span>
                <span className="detail-date">{formatDateTime(detailOrder.createdAt)}</span>
              </div>
              {detailOrder.customerName && (
                <div className="detail-customer">{detailOrder.customerName}</div>
              )}
              <div className="detail-payment-info">
                {PAYMENT_LABELS[detailOrder.paymentMethod || ''] || 'Sem pagamento'}
              </div>
            </div>

            {/* Items with customizations */}
            <div className="detail-items-section">
              <div className="detail-items-title">Itens</div>
              {detailOrder.items.map((item, i) => {
                const unitTotal = item.salePrice + (item.customizationTotal || 0)
                return (
                  <div key={i} className="detail-item-card">
                    <div className="detail-item-top">
                      <div className="detail-item-info">
                        <span className="detail-item-qty">{item.qty}x</span>
                        <span className="detail-item-name">{item.name}</span>
                      </div>
                      <span className="detail-item-total tabular">{formatMoney(unitTotal * item.qty)}</span>
                    </div>

                    {/* Customizations */}
                    {item.customizations && item.customizations.length > 0 && (
                      <div className="detail-customs">
                        {item.customizations.map((cg, gi) => (
                          <div key={gi} className="detail-custom-group">
                            <span className="detail-custom-group-name">{cg.groupName}:</span>
                            {cg.items.map((ci, ci2) => (
                              <span key={ci2} className="detail-custom-item">
                                {ci.qty > 1 ? ci.qty + 'x ' : ''}{ci.name}
                                {ci.price > 0 && <span className="detail-custom-price"> (+{formatMoney(ci.price)})</span>}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observation */}
                    {item.observation && (
                      <div className="detail-item-obs">
                        {item.observation}
                      </div>
                    )}

                    {/* Price breakdown if has customizations */}
                    {(item.customizationTotal || 0) > 0 && (
                      <div className="detail-item-breakdown">
                        <span>Produto: {formatMoney(item.salePrice)}</span>
                        <span>Adicionais: +{formatMoney(item.customizationTotal!)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="detail-total">
              <span>Total</span>
              <span className="tabular">{formatMoney(detailOrder.total)}</span>
            </div>

            {/* Actions */}
            <div className="detail-actions">
              <button className="btn btn-outline btn-full" onClick={handlePrint}>
                <Printer size={16} /> Imprimir
              </button>

              {(detailOrder.status === 'open' || detailOrder.status === 'pending') && (
                <>
                  <button className="btn btn-accent btn-full" onClick={() => setPayMethodModal(true)}>
                    Marcar como Pago
                  </button>
                  <button className="btn btn-ghost btn-full" style={{ color: 'var(--danger)' }} onClick={() => cancelOrder(detailOrder)}>
                    Cancelar Pedido
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment method selection for marking as paid */}
      <Modal
        open={payMethodModal}
        onClose={() => setPayMethodModal(false)}
        title="Forma de Pagamento"
      >
        {detailOrder && (
          <div className="pay-method-grid">
            {Object.entries(PAYMENT_LABELS).filter(([k]) => k !== 'pagar_depois').map(([key, label]) => (
              <button
                key={key}
                className="btn btn-outline"
                onClick={() => markAsPaid(detailOrder, key)}
              >
                {label}
              </button>
            ))}
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
