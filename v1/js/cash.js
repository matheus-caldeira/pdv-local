import { dbAll, dbPut, ensureSession } from './db.js';
import { todayStr, formatDate, formatMoney, createElement, showToast } from './helpers.js';

export async function loadCash() {
  var session = await ensureSession();
  document.getElementById('cashSessionDate').textContent = formatDate(session.date);
  document.getElementById('cashInitial').value = session.cashInitial || '';

  var allOrders = await dbAll('orders');
  var todayOrders = allOrders.filter(function(o) { return o.session === todayStr(); });
  var cashTotal = todayOrders.filter(function(o) { return o.paymentMethod === 'dinheiro'; })
    .reduce(function(s, o) { return s + o.total; }, 0);
  var pendingTotal = todayOrders.filter(function(o) { return o.paymentMethod === 'pagar_depois'; })
    .reduce(function(s, o) { return s + o.total; }, 0);

  var summaryCard = document.getElementById('cashSummaryCard');
  var summaryDiv = document.getElementById('cashSummary');

  if (todayOrders.length > 0) {
    summaryCard.style.display = 'block';
    summaryDiv.replaceChildren();

    var rows = [
      ['Dinheiro inicial', formatMoney(session.cashInitial || 0), null],
      ['Vendas em dinheiro', '+ ' + formatMoney(cashTotal), 'var(--green-800)'],
      ['Pendentes', formatMoney(pendingTotal), 'var(--red-500)']
    ];

    rows.forEach(function(r) {
      var val = createElement('span', { className: 'fw-700' }, r[1]);
      if (r[2]) val.style.color = r[2];
      summaryDiv.appendChild(createElement('div', { className: 'flex-between', style: { padding: '6px 0' } }, [
        createElement('span', { className: 'text-sm' }, r[0]),
        val
      ]));
    });

    var totalRow = createElement('div', { className: 'flex-between', style: { padding: '10px 0 0', borderTop: '2px solid var(--gray-200)', marginTop: '8px' } }, [
      createElement('span', { className: 'fw-700' }, 'Esperado no caixa'),
      createElement('span', { style: { fontSize: '18px', fontWeight: '800', color: 'var(--green-900)' } }, formatMoney((session.cashInitial || 0) + cashTotal))
    ]);
    summaryDiv.appendChild(totalRow);
  } else {
    summaryCard.style.display = 'none';
  }
}

async function saveCashInitial() {
  var val = parseFloat(document.getElementById('cashInitial').value) || 0;
  var session = await ensureSession();
  session.cashInitial = val;
  await dbPut('sessions', session);
  showToast('Dinheiro inicial salvo');
  loadCash();
}

export function initCash() {
  document.getElementById('btnSaveCash').addEventListener('click', saveCashInitial);
}
