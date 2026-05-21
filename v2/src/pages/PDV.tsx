import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react'
import { db, getConfig, claimTicket, findOrCreateCustomer, type Product, type Customer, type Order, type OrderItem, type CustomizationGroup, type CustomizationItem, type OrderCustomization } from '../db/database'
import { useSession } from '../hooks/useSession'
import { useToast } from '../components/Toast'
import { Modal } from '../components/Modal'
import { formatMoney, formatTicket } from '../utils/format'
import './PDV.css'

interface CartItem extends OrderItem {
  cartId: string // unique per cart entry (same product can appear with different customizations)
}

const PAYMENT_METHODS = [
  { key: 'pix', label: 'PIX', icon: 'P' },
  { key: 'credito', label: 'Credito', icon: 'C' },
  { key: 'debito', label: 'Debito', icon: 'D' },
  { key: 'dinheiro', label: 'Dinheiro', icon: '$' },
  { key: 'pagar_depois', label: 'Pagar Depois', icon: '...' },
]

interface CustomModalState {
  product: Product
  groups: (CustomizationGroup & { items: CustomizationItem[] })[]
  selections: Record<number, Record<number, number>> // groupId -> itemId -> qty
  observation: string
}

export function PDV() {
  const { activeSession } = useSession()
  const navigate = useNavigate()
  const toast = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [ticket, setTicket] = useState('')
  // Numero da comanda mostrado como sugestao. Se o operador nao editar o campo,
  // a sequencia e reservada na finalizacao; se editar, vale o valor digitado.
  const [ticketPreview, setTicketPreview] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null)
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
  // Passo do modal de pagamento: 'option' (1o) ou 'method' (2o).
  const [paymentStep, setPaymentStep] = useState<'option' | 'method'>('option')
  const [payOption, setPayOption] = useState<'now' | 'tab' | 'delivery' | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [customModal, setCustomModal] = useState<CustomModalState | null>(null)
  const [editingObsId, setEditingObsId] = useState<string | null>(null)
  const [obsText, setObsText] = useState('')

  // Mostra o proximo numero da sequencia como sugestao no campo de comanda,
  // SEM avancar o contador. O contador so e reservado quando o pedido e criado.
  async function suggestNextTicket() {
    const config = await getConfig()
    const next = formatTicket(config.ticketCounter, config.ticketLimit)
    setTicket(next)
    setTicketPreview(next)
  }

  // Busca clientes cujo telefone contem o texto digitado (autocomplete).
  async function onPhoneChange(value: string) {
    setPhone(value)
    setMatchedCustomer(null)
    const q = value.trim()
    if (q.length < 3) { setCustomerSuggestions([]); return }
    const all = await db.customers.toArray()
    setCustomerSuggestions(all.filter(c => c.phone.includes(q)).slice(0, 6))
  }

  // Seleciona um cliente da lista de sugestoes.
  function selectCustomer(c: Customer) {
    setMatchedCustomer(c)
    setPhone(c.phone)
    setCustomerName(c.name === 'Consumidor' ? '' : c.name)
    setAddress(c.addresses[0] || '')
    setCustomerSuggestions([])
  }

  useEffect(() => {
    db.products.filter(p => p.active !== false).toArray().then(setProducts)
    suggestNextTicket()
  }, [])

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
    return cats.sort()
  }, [products])

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products

  const total = cart.reduce((s, i) => s + (i.salePrice + (i.customizationTotal || 0)) * i.qty, 0)
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

  async function handleProductClick(product: Product) {
    const groupIds = product.customizationGroupIds || []
    if (groupIds.length === 0) {
      // No customizations — add directly
      addSimpleToCart(product)
      return
    }

    // Load groups and items
    const groups: CustomModalState['groups'] = []
    for (const gid of groupIds) {
      const group = await db.customizationGroups.get(gid)
      if (!group) continue
      const items = await db.customizationItems.where('groupId').equals(gid).toArray()
      groups.push({ ...group, items: items.filter(i => i.active !== false) })
    }

    if (groups.length === 0) {
      addSimpleToCart(product)
      return
    }

    setCustomModal({
      product,
      groups,
      selections: {},
      observation: '',
    })
  }

  function addSimpleToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id! && !i.customizations?.length)
      if (existing) {
        return prev.map(i =>
          i.cartId === existing.cartId ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [...prev, {
        cartId: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
        productId: product.id!,
        name: product.name,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        qty: 1,
      }]
    })
  }

  function calcCustomizationTotal(modal: CustomModalState): number {
    let total = 0
    for (const group of modal.groups) {
      const groupSelections = modal.selections[group.id!] || {}
      const selectedEntries = Object.entries(groupSelections).filter(([, qty]) => qty > 0)
      let freeCountGroup = group.chargeAfter // free selections at group level

      for (const [itemIdStr, qty] of selectedEntries) {
        const item = group.items.find(i => i.id === Number(itemIdStr))
        if (!item || item.price <= 0) continue

        for (let u = 0; u < qty; u++) {
          // Check group-level free
          if (freeCountGroup > 0) {
            freeCountGroup--
            continue
          }
          // Check item-level free
          if (item.chargeAfter > 0 && u < item.chargeAfter) {
            continue
          }
          total += item.price
        }
      }
    }
    return total
  }

  function confirmCustomization() {
    if (!customModal) return
    const { product, groups, selections, observation } = customModal

    // Validate required groups
    for (const group of groups) {
      if (group.required) {
        const sel = selections[group.id!] || {}
        const totalSelected = Object.values(sel).reduce((s, q) => s + q, 0)
        if (totalSelected < (group.minQty || 1)) {
          toast(`Selecione pelo menos ${group.minQty || 1} em "${group.name}"`, 'error')
          return
        }
      }
    }

    const customizations: OrderCustomization[] = []
    for (const group of groups) {
      const sel = selections[group.id!] || {}
      const items = Object.entries(sel)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => {
          const item = group.items.find(i => i.id === Number(itemId))!
          return { name: item.name, qty, price: item.price }
        })
      if (items.length > 0) {
        customizations.push({ groupName: group.name, items })
      }
    }

    const customTotal = calcCustomizationTotal(customModal)

    setCart(prev => [...prev, {
      cartId: Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      productId: product.id!,
      name: product.name,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      qty: 1,
      observation: observation.trim() || undefined,
      customizations: customizations.length > 0 ? customizations : undefined,
      customizationTotal: customTotal > 0 ? customTotal : undefined,
    }])

    setCustomModal(null)
  }

  function updateCustomSelection(groupId: number, itemId: number, delta: number) {
    if (!customModal) return
    const group = customModal.groups.find(g => g.id === groupId)
    if (!group) return

    setCustomModal(prev => {
      if (!prev) return prev
      const item = group.items.find(i => i.id === itemId)
      const groupSel = { ...(prev.selections[groupId] || {}) }
      const newQty = Math.max(0, (groupSel[itemId] || 0) + delta)

      // Check item max
      if (item?.maxQty && item.maxQty > 0 && newQty > item.maxQty) return prev

      groupSel[itemId] = newQty

      // Check group max
      const totalSelected = Object.values(groupSel).reduce((s, q) => s + q, 0)
      if (totalSelected > group.maxQty) return prev

      return {
        ...prev,
        selections: { ...prev.selections, [groupId]: groupSel },
      }
    })
  }

  function updateQty(cartId: string, delta: number) {
    setCart(prev =>
      prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    )
  }

  function removeCartItem(cartId: string) {
    setCart(prev => prev.filter(i => i.cartId !== cartId))
  }

  function openObsEdit(cartId: string) {
    const item = cart.find(i => i.cartId === cartId)
    setObsText(item?.observation || '')
    setEditingObsId(cartId)
  }

  function saveObs() {
    if (!editingObsId) return
    setCart(prev => prev.map(i =>
      i.cartId === editingObsId ? { ...i, observation: obsText.trim() || undefined } : i
    ))
    setEditingObsId(null)
    setObsText('')
  }

  // Mapeia a opcao de pagamento para status do pedido.
  function statusForOption(option: 'now' | 'tab' | 'delivery'): Order['status'] {
    if (option === 'now') return 'paid'
    if (option === 'delivery') return 'pending'
    return 'open'
  }

  async function finalizeSale(option?: 'now' | 'tab' | 'delivery') {
    const opt = option ?? payOption
    if (cart.length === 0 || !opt) return
    // Pagar agora / na entrega exigem meio de pagamento.
    if ((opt === 'now' || opt === 'delivery') && !selectedPayment) return

    // Define a comanda do pedido: se o operador manteve a sugestao, reserva o
    // proximo numero da sequencia (avancando o contador). Se digitou outro
    // valor, usa o digitado e nao mexe na sequencia.
    const edited = ticket.trim() !== ticketPreview
    const orderTicket = edited ? (ticket.trim() || '-') : await claimTicket()

    const realAddress = address === '__new__' ? '' : address.trim()
    const customerId = await findOrCreateCustomer(phone, customerName, realAddress)

    await db.orders.add({
      sessionId: activeSession!.id!,
      items: cart.map(({ productId, name, salePrice, costPrice, qty, observation, customizations, customizationTotal }) => ({
        productId, name, salePrice, costPrice, qty, observation, customizations, customizationTotal,
      })),
      total,
      paymentMethod: opt === 'tab' ? null : selectedPayment,
      customerName: customerName.trim(),
      customerId,
      customerPhone: phone.trim(),
      ticket: orderTicket,
      status: statusForOption(opt),
      stage: 'aceito',
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
    setPhone('')
    setAddress('')
    setMatchedCustomer(null)
    setSelectedPayment(null)
    setPayOption(null)
    setPaymentStep('option')
    setPaymentOpen(false)
    setSummaryExpanded(false)
    suggestNextTicket()
  }

  const itemUnitTotal = (item: CartItem) => item.salePrice + (item.customizationTotal || 0)

  return (
    <div className="pdv">
      <div className="pdv-products">
        <div className="pdv-header">
          <h1>Venda Rapida</h1>
        </div>

        {categories.length > 0 && (
          <div className="category-pills">
            <button className={`cat-pill ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>Todos</button>
            {categories.map(cat => (
              <button key={cat} className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
            ))}
          </div>
        )}

        <div className="cardapio-grid">
          {filteredProducts.length === 0 ? (
            <div className="cardapio-empty">
              {products.length === 0 ? 'Cadastre produtos primeiro' : 'Nenhum produto nesta categoria'}
            </div>
          ) : (
            filteredProducts.map(p => {
              const inCartQty = cart.filter(i => i.productId === p.id!).reduce((s, i) => s + i.qty, 0)
              const hasCustom = (p.customizationGroupIds?.length || 0) > 0
              return (
                <button key={p.id} className={`cardapio-item ${inCartQty > 0 ? 'in-cart' : ''}`} onClick={() => handleProductClick(p)}>
                  <span className="cardapio-name">{p.name}</span>
                  <span className="cardapio-price">{formatMoney(p.salePrice)}</span>
                  {hasCustom && <span className="cardapio-custom-badge">+</span>}
                  {inCartQty > 0 && <span className="cardapio-qty">{inCartQty}</span>}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Desktop sidebar cart */}
      <div className="pdv-cart-desktop">
        <div className="cart-header"><h2>Carrinho</h2></div>
        <div className="cart-fields">
          <div className="customer-phone-field">
            <input
              type="tel"
              className="cart-input"
              placeholder="Telefone do cliente"
              value={phone}
              onChange={e => onPhoneChange(e.target.value)}
            />
            {customerSuggestions.length > 0 && (
              <div className="customer-suggestions">
                {customerSuggestions.map(c => (
                  <button key={c.id} className="customer-suggestion" onClick={() => selectCustomer(c)}>
                    <span>{c.name}</span>
                    <span className="customer-suggestion-phone">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            className="cart-input"
            placeholder="Nome do cliente (opcional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
          {matchedCustomer && matchedCustomer.addresses.length > 0 ? (
            <select className="cart-input" value={address} onChange={e => setAddress(e.target.value)}>
              <option value="">Sem endereco</option>
              {matchedCustomer.addresses.map((a, i) => (
                <option key={i} value={a}>{a}</option>
              ))}
              <option value="__new__">+ Novo endereco</option>
            </select>
          ) : null}
          {(!matchedCustomer || address === '__new__') && (
            <input
              type="text"
              className="cart-input"
              placeholder="Endereco (opcional)"
              value={address === '__new__' ? '' : address}
              onChange={e => setAddress(e.target.value)}
            />
          )}
          <input
            type="text"
            className="cart-input"
            placeholder="Comanda / Mesa"
            value={ticket}
            onChange={e => setTicket(e.target.value)}
          />
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">Toque nos produtos para adicionar</div>
          ) : (
            cart.map(item => (
              <div key={item.cartId} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-price">{formatMoney(itemUnitTotal(item))} un.</span>
                </div>
                {item.customizations && item.customizations.map((c, i) => (
                  <div key={i} className="cart-item-customs">
                    {c.items.map((ci, j) => (
                      <span key={j} className="cart-custom-tag">{ci.qty > 1 ? ci.qty + 'x ' : ''}{ci.name}</span>
                    ))}
                  </div>
                ))}
                {item.observation && <div className="cart-item-obs">Obs: {item.observation}</div>}
                <div className="cart-item-controls">
                  <span className="cart-item-subtotal tabular">{formatMoney(itemUnitTotal(item) * item.qty)}</span>
                  <button className="qty-btn qty-btn-obs" onClick={() => openObsEdit(item.cartId)} title="Anotacao"><MessageSquare size={13} /></button>
                  <button className="qty-btn" onClick={() => updateQty(item.cartId, -1)}><Minus size={14} /></button>
                  <span className="qty-display tabular">{item.qty}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.cartId, 1)}><Plus size={14} /></button>
                  <button className="qty-btn qty-btn-remove" onClick={() => removeCartItem(item.cartId)}><Trash2 size={14} /></button>
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
            <button className="btn btn-accent btn-full" onClick={() => setPaymentOpen(true)}>Finalizar Venda</button>
          </div>
        )}
      </div>

      {/* Mobile bottom summary bar */}
      {cart.length > 0 && (
        <div className={`pdv-summary-bar ${summaryExpanded ? 'expanded' : ''}`}>
          {summaryExpanded && (
            <div className="summary-items">
              <div className="summary-fields">
                <div className="customer-phone-field">
                  <input
                    type="tel"
                    className="cart-input"
                    placeholder="Telefone do cliente"
                    value={phone}
                    onChange={e => onPhoneChange(e.target.value)}
                  />
                  {customerSuggestions.length > 0 && (
                    <div className="customer-suggestions">
                      {customerSuggestions.map(c => (
                        <button key={c.id} className="customer-suggestion" onClick={() => selectCustomer(c)}>
                          <span>{c.name}</span>
                          <span className="customer-suggestion-phone">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="cart-input"
                  placeholder="Cliente (opcional)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
                <input
                  type="text"
                  className="cart-input"
                  placeholder="Endereco (opcional)"
                  value={address === '__new__' ? '' : address}
                  onChange={e => setAddress(e.target.value)}
                />
                <input
                  type="text"
                  className="cart-input"
                  placeholder="Comanda / Mesa"
                  value={ticket}
                  onChange={e => setTicket(e.target.value)}
                />
              </div>
              {cart.map(item => (
                <div key={item.cartId} className="summary-item">
                  <div className="summary-item-left">
                    <span className="summary-item-qty tabular">{item.qty}x</span>
                    <div>
                      <span className="summary-item-name">{item.name}</span>
                      {item.customizations && (
                        <span className="summary-item-customs">
                          {item.customizations.flatMap(c => c.items.map(ci => ci.name)).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="summary-item-right">
                    <span className="summary-item-total tabular">{formatMoney(itemUnitTotal(item) * item.qty)}</span>
                    <button className="qty-btn-sm qty-btn-obs" onClick={() => openObsEdit(item.cartId)}><MessageSquare size={11} /></button>
                    <button className="qty-btn-sm" onClick={() => updateQty(item.cartId, -1)}><Minus size={12} /></button>
                    <button className="qty-btn-sm" onClick={() => updateQty(item.cartId, 1)}><Plus size={12} /></button>
                    <button className="qty-btn-sm qty-btn-remove" onClick={() => removeCartItem(item.cartId)}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="summary-footer">
            <button className="summary-toggle" onClick={() => setSummaryExpanded(!summaryExpanded)}>
              {summaryExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span className="summary-count tabular">{totalQty} {totalQty === 1 ? 'item' : 'itens'}</span>
            </button>
            <span className="summary-total tabular">{formatMoney(total)}</span>
            <button className="btn btn-accent btn-sm" onClick={() => setPaymentOpen(true)}>Pagar</button>
          </div>
        </div>
      )}

      {/* Customization modal */}
      <Modal open={!!customModal} onClose={() => setCustomModal(null)} title={customModal?.product.name || ''}>
        {customModal && (
          <div className="custom-modal">
            <div className="custom-modal-price tabular">{formatMoney(customModal.product.salePrice)}</div>

            {customModal.groups.map(group => {
              const groupSel = customModal.selections[group.id!] || {}
              const totalSelected = Object.values(groupSel).reduce((s, q) => s + q, 0)
              return (
                <div key={group.id} className="custom-modal-group">
                  <div className="custom-modal-group-header">
                    <div>
                      <span className="custom-modal-group-name">{group.name}</span>
                      <span className="custom-modal-group-range">
                        {group.required ? 'Obrigatorio' : 'Opcional'} · {group.minQty}-{group.maxQty}
                        {group.chargeAfter > 0 && ` · ${group.chargeAfter} gratis`}
                      </span>
                    </div>
                    <span className="custom-modal-group-count tabular">{totalSelected}/{group.maxQty}</span>
                  </div>
                  {group.items.map(item => {
                    const qty = groupSel[item.id!] || 0
                    return (
                      <div key={item.id} className="custom-modal-item">
                        <div className="custom-modal-item-info">
                          <span className="custom-modal-item-name">{item.name}</span>
                          {item.price > 0 && (
                            <span className="custom-modal-item-price tabular">
                              + {formatMoney(item.price)}
                              {item.chargeAfter > 0 && <span className="custom-modal-item-free"> ({item.chargeAfter} gratis)</span>}
                            </span>
                          )}
                          {(item.maxQty || 0) > 0 && (
                            <span className="custom-modal-item-max">max {item.maxQty}</span>
                          )}
                        </div>
                        <div className="custom-modal-item-controls">
                          {qty > 0 && (
                            <>
                              <button className="qty-btn-sm" onClick={() => updateCustomSelection(group.id!, item.id!, -1)}><Minus size={12} /></button>
                              <span className="qty-sm tabular">{qty}</span>
                            </>
                          )}
                          <button className="qty-btn-sm qty-btn-add" onClick={() => updateCustomSelection(group.id!, item.id!, 1)}
                            disabled={totalSelected >= group.maxQty || (item.maxQty > 0 && qty >= item.maxQty)}><Plus size={12} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            <div className="custom-modal-obs">
              <label>Observacao</label>
              <textarea
                value={customModal.observation}
                onChange={e => setCustomModal(prev => prev ? { ...prev, observation: e.target.value } : prev)}
                placeholder="Ex: Sem cebola, ponto da carne..."
                rows={2}
              />
            </div>

            {calcCustomizationTotal(customModal) > 0 && (
              <div className="custom-modal-extra">
                Adicionais: + {formatMoney(calcCustomizationTotal(customModal))}
              </div>
            )}

            <button className="btn btn-accent btn-full" onClick={confirmCustomization} style={{ marginTop: 'var(--space-3)' }}>
              Adicionar · {formatMoney(customModal.product.salePrice + calcCustomizationTotal(customModal))}
            </button>
          </div>
        )}
      </Modal>

      {/* Observation modal */}
      <Modal open={!!editingObsId} onClose={() => setEditingObsId(null)} title="Anotacao do Item">
        <textarea
          className="obs-textarea"
          value={obsText}
          onChange={e => setObsText(e.target.value)}
          placeholder="Ex: Sem cebola, bem passado, molho a parte..."
          rows={3}
          autoFocus
        />
        <button className="btn btn-accent btn-full" onClick={saveObs} style={{ marginTop: 'var(--space-3)' }}>
          Salvar
        </button>
      </Modal>

      {/* Payment modal */}
      <Modal
        open={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPaymentStep('option'); setPayOption(null); setSelectedPayment(null) }}
        title={paymentStep === 'option' ? 'Como deseja pagar?' : 'Forma de Pagamento'}
      >
        <div className="payment-total tabular">{formatMoney(total)}</div>

        {paymentStep === 'option' ? (
          <div className="payment-options">
            <button
              className="payment-option"
              onClick={() => { setPayOption('now'); setPaymentStep('method') }}
            >
              Pagar agora
            </button>
            <button
              className="payment-option"
              onClick={() => finalizeSale('tab')}
            >
              Abrir comanda
            </button>
            <button
              className="payment-option"
              onClick={() => { setPayOption('delivery'); setPaymentStep('method') }}
            >
              Pagar na entrega
            </button>
          </div>
        ) : (
          <>
            <div className="payment-methods">
              {PAYMENT_METHODS.filter(pm => pm.key !== 'pagar_depois').map(pm => (
                <button
                  key={pm.key}
                  className={`payment-method ${selectedPayment === pm.key ? 'selected' : ''}`}
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
              onClick={() => finalizeSale()}
              style={{ marginTop: 'var(--space-4)' }}
            >
              Confirmar Pagamento
            </button>
          </>
        )}
      </Modal>
    </div>
  )
}
