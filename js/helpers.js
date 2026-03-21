export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(str) {
  const parts = str.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export function formatMoney(v) {
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function setText(el, text) {
  if (typeof el === 'string') el = document.getElementById(el);
  if (el) el.textContent = text;
}

export function createElement(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function(key) {
      if (key === 'className') el.className = attrs[key];
      else if (key === 'style' && typeof attrs[key] === 'object') {
        Object.assign(el.style, attrs[key]);
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else el.setAttribute(key, attrs[key]);
    });
  }
  if (children) {
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) children.forEach(function(c) { if (c) el.appendChild(c); });
    else el.appendChild(children);
  }
  return el;
}

export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

export function openModal(id) {
  document.getElementById(id).classList.add('open');
}

export var PAYMENT_LABELS = {
  pix: 'PIX', credito: 'Credito', debito: 'Debito',
  dinheiro: 'Dinheiro', pagar_depois: 'Pagar Depois'
};

export function paymentLabel(m) {
  return PAYMENT_LABELS[m] || 'Aberto';
}
