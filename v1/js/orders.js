import { dbAll, dbGet, dbPut, dbDelete } from './db.js';
import { todayStr, formatDate, formatMoney, genId, setText, createElement, showToast, closeModal, openModal, paymentLabel } from './helpers.js';
import { navigateTo } from './navigation.js';

var currentOrderItems = [];
var editingOrderId = null;
var selectedPayment = null;
var pendingPayHandler = null;

// Expose for navigation module to call on back
export function saveCurrentOrder() {
  if (!editingOrderId) return;
  var total = currentOrderItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var comanda = document.getElementById('orderComanda').value.trim();
  var responsavel = document.getElementById('orderResponsavel').value.trim();
  if (!comanda || !responsavel) return;

  dbGet('orders', editingOrderId).then(function(existing) {
    if (!existing) return;
    existing.items = currentOrderItems.map(function(i) { return { productId: i.productId, name: i.name, price: i.price, qty: i.qty }; });
    existing.total = total;
    existing.comanda = comanda;
    existing.responsavel = responsavel;
    existing.updatedAt = Date.now();
    dbPut('orders', existing);
  });
}

var cachedTodayOrders = [];

export async function loadOrders() {
  var today = todayStr();
  var allOrders = await dbAll('orders');
  cachedTodayOrders = allOrders.filter(function(o) { return o.session === today; })
    .sort(function(a, b) { return Number(a.comanda) - Number(b.comanda); });

  // Clear search on reload
  var searchInput = document.getElementById('orderSearch');
  if (searchInput) searchInput.value = '';

  renderOrderList(cachedTodayOrders);
}

function filterOrders(query) {
  if (!query) return renderOrderList(cachedTodayOrders);
  var q = query.toLowerCase();
  var filtered = cachedTodayOrders.filter(function(o) {
    return String(o.comanda).includes(q) || o.responsavel.toLowerCase().includes(q);
  });
  renderOrderList(filtered);
}

function renderOrderList(orders) {
  var container = document.getElementById('ordersList');
  container.replaceChildren();

  if (orders.length === 0) {
    container.appendChild(createElement('div', { className: 'empty-state' },
      createElement('p', null, 'Nenhum pedido encontrado')));
    return;
  }

  orders.forEach(function(o) {
    var isPending = o.paymentMethod === 'pagar_depois';
    var isOpen = !o.paymentMethod;
    var statusClass = isPending ? 'badge-pending' : (isOpen ? 'badge-open' : 'badge-paid');
    var statusText = isPending ? 'Pendente' : (isOpen ? 'Aberto' : 'Pago');
    var itemCount = o.items ? o.items.length : 0;

    var card = createElement('div', { className: 'order-card', onClick: function() { openOrderForEdit(o.id); } }, [
      createElement('div', { className: 'order-info' }, [
        createElement('h3', null, '#' + o.comanda + ' - ' + o.responsavel),
        createElement('p', null, itemCount + (itemCount === 1 ? ' item' : ' itens') + ' \u00B7 ' + paymentLabel(o.paymentMethod))
      ]),
      createElement('div', { className: 'order-right' }, [
        createElement('div', { className: 'amount' }, formatMoney(o.total)),
        createElement('span', { className: 'badge ' + statusClass, style: { marginTop: '4px' } }, statusText)
      ])
    ]);
    container.appendChild(card);
  });
}

// New flow: create comanda first (number + responsible), no items yet
export async function createNewOrder() {
  openModal('newOrderModal');
}

export async function confirmNewOrder() {
  var comanda = document.getElementById('newOrderComanda').value.trim();
  var responsavel = document.getElementById('newOrderResponsavel').value.trim();
  if (!comanda || !responsavel) {
    showToast('Preencha comanda e responsavel');
    return;
  }

  var order = {
    id: genId(),
    comanda: comanda,
    responsavel: responsavel,
    items: [],
    total: 0,
    paymentMethod: null,
    session: todayStr(),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await dbPut('orders', order);
  closeModal('newOrderModal');
  document.getElementById('newOrderComanda').value = '';
  document.getElementById('newOrderResponsavel').value = '';
  showToast('Comanda criada');

  // Open the order for editing immediately
  openOrderForEdit(order.id);
}

// Open order for editing (add items, close, etc)
export async function openOrderForEdit(id) {
  var order = await dbGet('orders', id);
  if (!order) return;

  editingOrderId = id;
  currentOrderItems = order.items ? order.items.map(function(i) {
    return { productId: i.productId, name: i.name, price: i.price, qty: i.qty };
  }) : [];

  document.getElementById('orderComanda').value = order.comanda;
  document.getElementById('orderResponsavel').value = order.responsavel;

  var isPaid = order.paymentMethod && order.paymentMethod !== 'pagar_depois';
  setText('orderPageTitle', 'Comanda #' + order.comanda);

  // Show/hide payment status
  var statusEl = document.getElementById('orderStatus');
  if (isPaid) {
    statusEl.textContent = 'Pago - ' + paymentLabel(order.paymentMethod);
    statusEl.className = 'badge badge-paid mb-16';
    statusEl.style.display = '';
  } else if (order.paymentMethod === 'pagar_depois') {
    statusEl.textContent = 'Pendente';
    statusEl.className = 'badge badge-pending mb-16';
    statusEl.style.display = '';
  } else {
    statusEl.style.display = 'none';
  }

  renderOrderItems();
  await renderProductGrid();
  navigateTo('order-edit');
}

export async function renderProductGrid() {
  var products = await dbAll('products');
  var grid = document.getElementById('productGrid');
  grid.replaceChildren();

  if (products.length === 0) {
    grid.appendChild(createElement('div', {
      className: 'text-sm text-muted',
      style: { gridColumn: '1/-1', textAlign: 'center', padding: '20px' }
    }, 'Cadastre produtos primeiro'));
    return;
  }

  products.forEach(function(p) {
    var btn = createElement('div', { className: 'product-btn', onClick: function() { addItemToOrder(p.id, p.name, p.price); } }, [
      createElement('div', { className: 'name' }, p.name),
      createElement('div', { className: 'price' }, formatMoney(p.price))
    ]);
    grid.appendChild(btn);
  });
}

function addItemToOrder(productId, name, price) {
  var existing = currentOrderItems.find(function(i) { return i.productId === productId; });
  if (existing) {
    existing.qty++;
  } else {
    currentOrderItems.push({ productId: productId, name: name, price: price, qty: 1 });
  }
  renderOrderItems();
  autoSaveOrder();
}

function changeQty(productId, delta) {
  var item = currentOrderItems.find(function(i) { return i.productId === productId; });
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    currentOrderItems = currentOrderItems.filter(function(i) { return i.productId !== productId; });
  }
  renderOrderItems();
  autoSaveOrder();
}

function renderOrderItems() {
  var list = document.getElementById('orderItemsList');
  var card = document.getElementById('orderItemsCard');
  var empty = document.getElementById('orderItemsEmpty');
  var totalBar = document.getElementById('totalBar');

  if (currentOrderItems.length === 0) {
    card.style.display = 'none';
    empty.style.display = 'block';
    totalBar.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  empty.style.display = 'none';
  totalBar.style.display = 'flex';

  var total = currentOrderItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  setText('totalAmount', formatMoney(total));

  list.replaceChildren();
  currentOrderItems.forEach(function(i) {
    var row = createElement('div', { className: 'order-item' }, [
      createElement('div', null, [
        createElement('div', { className: 'fw-700 text-sm' }, i.name),
        createElement('div', { className: 'text-sm text-muted' }, formatMoney(i.price) + ' un.')
      ]),
      createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        createElement('div', { className: 'text-sm text-muted' }, formatMoney(i.price * i.qty)),
        createElement('div', { className: 'qty-controls' }, [
          createElement('button', { className: 'qty-btn', onClick: function() { changeQty(i.productId, -1); } }, '\u2212'),
          createElement('span', { className: 'qty' }, String(i.qty)),
          createElement('button', { className: 'qty-btn', onClick: function() { changeQty(i.productId, 1); } }, '+')
        ])
      ])
    ]);
    list.appendChild(row);
  });
}

// Auto-save order as items are added
async function autoSaveOrder() {
  if (!editingOrderId) return;
  var total = currentOrderItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var order = await dbGet('orders', editingOrderId);
  if (!order) return;
  order.items = currentOrderItems.map(function(i) { return { productId: i.productId, name: i.name, price: i.price, qty: i.qty }; });
  order.total = total;
  order.comanda = document.getElementById('orderComanda').value.trim();
  order.responsavel = document.getElementById('orderResponsavel').value.trim();
  order.updatedAt = Date.now();
  await dbPut('orders', order);
}

export function openPayment() {
  if (currentOrderItems.length === 0) {
    showToast('Adicione itens primeiro');
    return;
  }
  var total = currentOrderItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  setText('paymentTotal', formatMoney(total));
  selectedPayment = null;
  document.querySelectorAll('.payment-option').forEach(function(el) { el.classList.remove('selected'); });
  document.getElementById('confirmPaymentBtn').disabled = true;
  pendingPayHandler = null;
  openModal('paymentModal');
}

export async function confirmPayment() {
  if (pendingPayHandler) {
    await pendingPayHandler();
    return;
  }

  var total = currentOrderItems.reduce(function(s, i) { return s + i.price * i.qty; }, 0);
  var order = await dbGet('orders', editingOrderId);
  if (!order) return;

  order.items = currentOrderItems.map(function(i) { return { productId: i.productId, name: i.name, price: i.price, qty: i.qty }; });
  order.total = total;
  order.paymentMethod = selectedPayment;
  order.updatedAt = Date.now();

  await dbPut('orders', order);
  closeModal('paymentModal');
  document.getElementById('totalBar').style.display = 'none';
  currentOrderItems = [];
  editingOrderId = null;
  navigateTo('orders');
  showToast('Pedido fechado');
}

export async function deleteOrder() {
  if (!editingOrderId) return;
  if (confirm('Excluir este pedido?')) {
    await dbDelete('orders', editingOrderId);
    editingOrderId = null;
    currentOrderItems = [];
    document.getElementById('totalBar').style.display = 'none';
    navigateTo('orders');
    showToast('Pedido excluido');
  }
}

export function selectPaymentMethod(method) {
  selectedPayment = method;
  document.getElementById('confirmPaymentBtn').disabled = false;
}

export function initOrders() {
  document.getElementById('btnNewOrder').addEventListener('click', createNewOrder);
  document.getElementById('btnConfirmNewOrder').addEventListener('click', confirmNewOrder);
  document.getElementById('cancelNewOrderBtn').addEventListener('click', function() { closeModal('newOrderModal'); });
  document.getElementById('btnFinishOrder').addEventListener('click', openPayment);
  document.getElementById('btnDeleteOrder').addEventListener('click', deleteOrder);
  document.getElementById('confirmPaymentBtn').addEventListener('click', confirmPayment);
  document.getElementById('cancelPaymentBtn').addEventListener('click', function() { closeModal('paymentModal'); });

  // Payment option selection
  document.querySelectorAll('.payment-option').forEach(function(el) {
    el.addEventListener('click', function() {
      document.querySelectorAll('.payment-option').forEach(function(o) { o.classList.remove('selected'); });
      el.classList.add('selected');
      selectPaymentMethod(el.dataset.method);
    });
  });

  // Search filter
  document.getElementById('orderSearch').addEventListener('input', function(e) {
    filterOrders(e.target.value.trim());
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}
