import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { db, type Product, type OrderItem } from '../db/database'
import { useSession } from '../hooks/useSession'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { formatMoney } from '../utils/format'
import './PDV.css'

interface CartItem extends OrderItem {
  id: number
}

const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX', icon: 'P' },
  { key: 'credito', label: 'Credito', icon: 'C' },
  { key: 'debito', label: 'Debito', icon: 'D' },
  { key: 'dinheiro', label: 'Dinheiro', icon: '$' },
  { key: 'pagar_depois', label: 'Pagar Depois', icon: '...' },
]

export function PDV() {
  const { activeSession } = useSession()
  const navigate = useNavigate()
  const toast = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [ticket, setTicket] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  useEffect(() => {
    db.products.filter(p => p.active !== false).toArray().then(setProducts)
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
    return cats.sort()
  }, [products])

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products

  const total = cart.reduce((s, i) => s + i.salePrice * i.qty, 0)
  const totalQty = cart.reduce((s, i) => s + i.qty, 0)

  if (!activeSession) {
    return (
      <div className="pdv-no-session">
        <h2>Abra o caixa para vender</h2>
        <button className="btn btn-accent" onClick={() => navigate('/cash')}>
          Abrir Caixa
        </button>
      </div>
    )
  }

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id!)
      if (existing) {
        return prev.map(i =>
          i.productId === product.id! ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, {
        id: product.id!,
        productId: product.id!,
        name: product.name,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        qty: 1,
      }]
    })
  }

  function updateQty(productId: number, delta: number) {
    setCart(prev =>
      prev.map(i =>
        i.productId === productId ? { ...i, qty: i.qty + delta } : i
      ).filter(i => i.qty > 0)
    )
  }

  function removeItem(productId: number) {
    setCart(prev => prev.filter(i => i.productId !== productId))
  }

  async function finalizeSale() {
    if (!selectedPayment || cart.length === 0) return

    await db.orders.add({
      sessionId: activeSession!.id!,
      items: cart.map(({ productId, name, salePrice, costPrice, qty }) => ({
        productId, name, salePrice, costPrice, qty,
      })),
      total,
      paymentMethod: selectedPayment,
      customerName: customerName.trim(),
      ticket: ticket.trim() || String(Date.now()).slice(-4),
      status: selectedPayment === 'pagar_depois' ? 'pending' : 'paid',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    for (const item of cart) {
      const product = await db.products.get(item.productId)
      if (product && product.stock > 0) {
        await db.products.update(item.productId, { stock: product.stock - item.qty })
      }
    }

    toast('Venda registrada!')
    setCart([])
    setCustomerName('')
    setTicket('')
    setSelectedPayment(null)
    setPaymentOpen(false)
    setSummaryExpanded(false)
  }

  return (
    <div className="pdv">
      <div className="pdv-products">
        <div className="pdv-header">
          <h1>Venda Rapida</h1>
        </div>

        {categories.length > 0 && (
          <div className="category-pills">
            <button
              className={`cat-pill ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="cardapio-grid">
          {filteredProducts.length === 0 ? (
            <div className="cardapio-empty">
              {products.length === 0
                ? 'Cadastre produtos primeiro'
                : 'Nenhum produto nesta categoria'}
            </div>
          ) : (
            filteredProducts.map(p => {
              const inCart = cart.find(i => i.productId === p.id!)
              return (
                <button
                  key={p.id}
                  className={`cardapio-item ${inCart ? 'in-cart' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  <span className="cardapio-name">{p.name}</span>
                  <span className="cardapio-price">{formatMoney(p.salePrice)}</span>
                  {inCart && <span className="cardapio-qty">{inCart.qty}</span>}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop sidebar cart */}
      <div className="pdv-cart-desktop">
        <div className="cart-header">
          <h2>Carrinho</h2>
        </div>
        <div className="cart-fields">
          <input type="text" className="cart-input" placeholder="Nome do cliente (opcional)"
            value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <input type="text" className="cart-input" placeholder="Comanda / Mesa"
            value={ticket} onChange={e => setTicket(e.target.value)} />
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">Toque nos produtos para adicionar</div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">{formatMoney(item.salePrice)} un.</span>
                </div>
                <div className="cart-item-controls">
                  <span className="cart-item-subtotal tabular">{formatMoney(item.salePrice * item.qty)}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}><Minus size={14} /></button>
                  <span className="qty-display tabular">{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.productId, 1)}><Plus size={14} /></button>
                  <button className="qty-btn qty-btn-remove" onClick={() => removeItem(item.productId)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total-value tabular">{formatMoney(total)}</span>
            </div>
            <button className="btn btn-accent btn-full" onClick={() => setPaymentOpen(true)}>
              Finalizar Venda
            </button>
          </div>
        )}
      </div>

      {/* Mobile bottom summary bar */}
      {cart.length > 0 && (
        <div className={`pdv-summary-bar ${summaryExpanded ? 'expanded' : ''}`}>
          {/* Expandable items list */}
          {summaryExpanded && (
            <div className="summary-items">
              <div className="summary-fields">
                <input type="text" className="cart-input" placeholder="Nome do cliente (opcional)"
                  value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <input type="text" className="cart-input" placeholder="Comanda / Mesa"
                  value={ticket} onChange={e => setTicket(e.target.value)} />
              </div>
              {cart.map(item => (
                <div key={item.productId} className="summary-item">
                  <div className="summary-item-left">
                    <span className="summary-item-qty tabular">{item.qty}x</span>
                    <span className="summary-item-name">{item.name}</span>
                  </div>
                  <div className="summary-item-right">
                    <span className="summary-item-total tabular">{formatMoney(item.salePrice * item.qty)}</span>
                    <button className="qty-btn-sm" onClick={() => updateQty(item.productId, -1)}><Minus size={12} /></button>
                    <button className="qty-btn-sm" onClick={() => updateQty(item.productId, 1)}><Plus size={12} /></button>
                    <button className="qty-btn-sm qty-btn-remove" onClick={() => removeItem(item.productId)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Always visible footer */}
          <div className="summary-footer">
            <button className="summary-toggle" onClick={() => setSummaryExpanded(!summaryExpanded)}>
              {summaryExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span className="summary-count tabular">{totalQty} {totalQty === 1 ? 'item' : 'itens'}</span>
            </button>
            <span className="summary-total tabular">{formatMoney(total)}</span>
            <button className="btn btn-accent btn-sm" onClick={() => setPaymentOpen(true)}>
              Pagar
            </button>
          </div>
        </div>
      )}

      {/* Payment modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Forma de Pagamento">
        <div className="payment-total tabular">{formatMoney(total)}</div>
        <div className="payment-methods">
          {PAYMENT_METHODS.map(pm => (
            <button
              key={pm.key}
              className={`payment-method ${selectedPayment === pm.key ? 'selected' : ''} ${pm.key === 'pagar_depois' ? 'pay-later' : ''}`}
              onClick={() => setSelectedPayment(pm.key)}
            >
              <span className="pm-icon">{pm.icon}</span>
              <span className="pm-label">{pm.label}</span>
            </button>
          ))}
        </div>
        <button
          className="btn btn-accent btn-full"
          disabled={!selectedPayment}
          onClick={finalizeSale}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Confirmar Pagamento
        </button>
      </Modal>
    </div>
  )
}
