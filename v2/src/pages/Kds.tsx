import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { db, type Order, type OrderStage } from '../db/database'
import { useSession } from '../hooks/useSession'
import { ORDER_STAGES, STAGE_LABELS, nextStage, prevStage } from '../utils/order'
import { formatMoney } from '../utils/format'
import './Kds.css'

export function Kds() {
  const { activeSession } = useSession()
  const [activeTab, setActiveTab] = useState<OrderStage>('aceito')
  const [dragOver, setDragOver] = useState<OrderStage | null>(null)

  // liveQuery: re-roda sozinho quando qualquer pedido muda no banco.
  const orders = useLiveQuery(
    async () => {
      if (!activeSession?.id) return []
      return db.orders.where('sessionId').equals(activeSession.id).toArray()
    },
    [activeSession?.id],
  ) ?? []

  async function moveOrder(order: Order, stage: OrderStage) {
    if (!order.id) return
    await db.orders.update(order.id, { stage, updatedAt: Date.now() })
  }

  function byStage(stage: OrderStage) {
    return orders
      .filter(o => o.stage === stage && o.status !== 'cancelled')
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  if (!activeSession) {
    return (
      <div className="kds-page">
        <div className="page-header"><h1>KDS</h1></div>
        <div className="kds-empty">Abra o caixa para gerenciar pedidos.</div>
      </div>
    )
  }

  return (
    <div className="kds-page">
      <div className="page-header"><h1>KDS</h1></div>

      <div className="kds-board">
        {ORDER_STAGES.map(stage => {
          const list = byStage(stage)
          return (
            <div
              key={stage}
              className={`kds-col ${stage === activeTab ? 'kds-col-active' : ''} ${dragOver === stage ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                setDragOver(null)
                const id = Number(e.dataTransfer.getData('text/plain'))
                const order = orders.find(o => o.id === id)
                if (order && order.stage !== stage) moveOrder(order, stage)
              }}
            >
              <div className="kds-col-title">
                <span>{STAGE_LABELS[stage]}</span>
                <span>{list.length}</span>
              </div>
              {list.map(order => {
                const prev = prevStage(order.stage)
                const next = nextStage(order.stage)
                return (
                  <div
                    key={order.id}
                    className="kds-card"
                    draggable
                    onDragStart={e => e.dataTransfer.setData('text/plain', String(order.id))}
                  >
                    <div className="kds-card-head">
                      <span className="kds-card-ticket">#{order.ticket}</span>
                      <span>{formatMoney(order.total)}</span>
                    </div>
                    {order.customerName && (
                      <div className="kds-card-items">{order.customerName}</div>
                    )}
                    <div className="kds-card-items">
                      {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </div>
                    <div className="kds-card-actions">
                      {prev && (
                        <button className="btn btn-ghost btn-sm" onClick={() => moveOrder(order, prev)}>
                          <ChevronLeft size={14} /> Voltar
                        </button>
                      )}
                      {next && (
                        <button className="btn btn-accent btn-sm" onClick={() => moveOrder(order, next)}>
                          Avancar <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="kds-tabs">
        {ORDER_STAGES.map(stage => (
          <button
            key={stage}
            className={`kds-tab ${stage === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(stage)}
          >
            {STAGE_LABELS[stage]} ({byStage(stage).length})
          </button>
        ))}
      </div>
    </div>
  )
}
