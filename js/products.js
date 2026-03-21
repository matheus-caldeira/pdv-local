import { dbAll, dbGet, dbPut, dbDelete } from './db.js';
import { formatMoney, genId, setText, createElement, showToast, closeModal, openModal } from './helpers.js';

function createSvgEdit() {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20'); svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
  var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p1.setAttribute('d', 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7');
  var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p2.setAttribute('d', 'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z');
  svg.appendChild(p1); svg.appendChild(p2);
  return svg;
}

function createSvgTrash() {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20'); svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2');
  var p1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  p1.setAttribute('points', '3 6 5 6 21 6');
  var p2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p2.setAttribute('d', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2');
  svg.appendChild(p1); svg.appendChild(p2);
  return svg;
}

export async function loadProducts() {
  var products = await dbAll('products');
  var container = document.getElementById('productsList');
  container.replaceChildren();

  if (products.length === 0) {
    container.appendChild(createElement('div', { className: 'empty-state' },
      createElement('p', null, 'Nenhum produto cadastrado')));
    return;
  }

  products.forEach(function(p) {
    var card = createElement('div', { className: 'card flex-between' }, [
      createElement('div', null, [
        createElement('div', { className: 'fw-700' }, p.name),
        createElement('div', { className: 'text-sm text-muted' }, formatMoney(p.price))
      ]),
      createElement('div', { className: 'd-flex gap-8' }, [
        createElement('button', { className: 'btn btn-ghost', onClick: function() { openProductModal(p.id); } },
          createSvgEdit()),
        createElement('button', { className: 'btn btn-ghost', style: { color: 'var(--red-500)' }, onClick: function() { deleteProduct(p.id); } },
          createSvgTrash())
      ])
    ]);
    container.appendChild(card);
  });
}

export function openProductModal(id) {
  document.getElementById('productEditId').value = id || '';
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  setText('productModalTitle', id ? 'Editar Produto' : 'Novo Produto');
  if (id) {
    dbGet('products', id).then(function(p) {
      document.getElementById('productName').value = p.name;
      document.getElementById('productPrice').value = p.price;
    });
  }
  openModal('productModal');
}

async function deleteProduct(id) {
  if (confirm('Remover este produto?')) {
    await dbDelete('products', id);
    loadProducts();
    showToast('Produto removido');
  }
}

export async function saveProduct() {
  var name = document.getElementById('productName').value.trim();
  var price = parseFloat(document.getElementById('productPrice').value);
  if (!name || isNaN(price) || price <= 0) {
    showToast('Preencha nome e preco');
    return;
  }
  var editId = document.getElementById('productEditId').value;
  await dbPut('products', { id: editId || genId(), name: name, price: price });
  closeModal('productModal');
  loadProducts();
  showToast(editId ? 'Produto atualizado' : 'Produto criado');
}

export function initProducts() {
  document.getElementById('btnNewProduct').addEventListener('click', function() { openProductModal(); });
  document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
  document.getElementById('cancelProductBtn').addEventListener('click', function() { closeModal('productModal'); });
}
