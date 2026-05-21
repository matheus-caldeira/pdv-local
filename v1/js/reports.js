import { dbAll, dbGet } from './db.js';
import { formatDate, formatMoney, createElement, showToast, paymentLabel } from './helpers.js';
import { openOrderForEdit } from './orders.js';

var METHODS = ['pix', 'credito', 'debito', 'dinheiro', 'pagar_depois'];

export async function loadReports() {
  var sessions = await dbAll('sessions');
  var container = document.getElementById('reportSessions');
  container.replaceChildren();

  if (sessions.length === 0) {
    container.appendChild(createElement('span', { className: 'text-sm text-muted' }, 'Nenhuma sessao'));
    document.getElementById('reportContent').replaceChildren();
    return;
  }

  var sorted = sessions.sort(function(a, b) { return b.date.localeCompare(a.date); });
  var activeSession = sorted[0].date;

  sorted.forEach(function(s) {
    var pill = createElement('button', {
      className: 'session-pill' + (s.date === activeSession ? ' active' : ''),
      onClick: function() { selectReportSession(s.date); }
    }, formatDate(s.date));
    pill.dataset.sessionDate = s.date;
    container.appendChild(pill);
  });

  renderReport(activeSession);
}

function selectReportSession(date) {
  document.querySelectorAll('.session-pill').forEach(function(p) { p.classList.remove('active'); });
  var target = document.querySelector('.session-pill[data-session-date="' + date + '"]');
  if (target) target.classList.add('active');
  renderReport(date);
}

async function renderReport(sessionDate) {
  var allOrders = await dbAll('orders');
  var orders = allOrders.filter(function(o) { return o.session === sessionDate; });
  var content = document.getElementById('reportContent');
  content.replaceChildren();

  if (orders.length === 0) {
    content.appendChild(createElement('div', { className: 'empty-state' },
      createElement('p', null, 'Nenhum pedido nesta sessao')));
    return;
  }

  var totalGeral = orders.reduce(function(s, o) { return s + o.total; }, 0);
  var byMethod = {};
  METHODS.forEach(function(m) {
    byMethod[m] = orders.filter(function(o) { return o.paymentMethod === m; })
      .reduce(function(s, o) { return s + o.total; }, 0);
  });
  var paidTotal = totalGeral - (byMethod.pagar_depois || 0);

  // Summary cards
  var summary = createElement('div', { className: 'report-summary' }, [
    createElement('div', { className: 'report-stat full' }, [
      createElement('div', { className: 'stat-value' }, formatMoney(totalGeral)),
      createElement('div', { className: 'stat-label' }, 'Total Geral')
    ]),
    createElement('div', { className: 'report-stat' }, [
      createElement('div', { className: 'stat-value' }, String(orders.length)),
      createElement('div', { className: 'stat-label' }, 'Pedidos')
    ]),
    createElement('div', { className: 'report-stat' }, [
      createElement('div', { className: 'stat-value' }, formatMoney(paidTotal)),
      createElement('div', { className: 'stat-label' }, 'Recebido')
    ])
  ]);
  content.appendChild(summary);

  // By payment method
  content.appendChild(createElement('div', { className: 'section-title' }, 'Por Forma de Pagamento'));
  var methodCard = createElement('div', { className: 'card' });
  METHODS.forEach(function(m) {
    methodCard.appendChild(createElement('div', { className: 'flex-between', style: { padding: '6px 0' } }, [
      createElement('span', { className: 'text-sm' }, paymentLabel(m)),
      createElement('span', { className: 'fw-700 text-sm' }, formatMoney(byMethod[m]))
    ]));
  });
  content.appendChild(methodCard);

  // Copy button
  content.appendChild(createElement('button', { className: 'btn btn-amber mb-16', onClick: function() { copyReport(sessionDate); } }, 'Copiar Resumo (WhatsApp)'));

  // All orders
  content.appendChild(createElement('div', { className: 'section-title' }, 'Todos os Pedidos'));
  orders.sort(function(a, b) { return b.createdAt - a.createdAt; }).forEach(function(o) {
    var isPending = o.paymentMethod === 'pagar_depois';
    var isOpen = !o.paymentMethod;
    var sc = isPending ? 'badge-pending' : (isOpen ? 'badge-open' : 'badge-paid');
    var st = isPending ? 'Pendente' : (isOpen ? 'Aberto' : 'Pago');

    var card = createElement('div', { className: 'order-card', onClick: function() { openOrderForEdit(o.id); } }, [
      createElement('div', { className: 'order-info' }, [
        createElement('h3', null, '#' + o.comanda + ' - ' + o.responsavel),
        createElement('p', null, paymentLabel(o.paymentMethod))
      ]),
      createElement('div', { className: 'order-right' }, [
        createElement('div', { className: 'amount' }, formatMoney(o.total)),
        createElement('span', { className: 'badge ' + sc, style: { marginTop: '4px' } }, st)
      ])
    ]);
    content.appendChild(card);
  });
}

async function copyReport(sessionDate) {
  var allOrders = await dbAll('orders');
  var orders = allOrders.filter(function(o) { return o.session === sessionDate; });
  var session = await dbGet('sessions', sessionDate);

  var totalGeral = orders.reduce(function(s, o) { return s + o.total; }, 0);
  var byMethod = {};
  METHODS.forEach(function(m) {
    byMethod[m] = orders.filter(function(o) { return o.paymentMethod === m; })
      .reduce(function(s, o) { return s + o.total; }, 0);
  });

  var pendingOrders = orders.filter(function(o) { return o.paymentMethod === 'pagar_depois'; });
  var openOrders = orders.filter(function(o) { return !o.paymentMethod; });
  var unpaidTotal = (byMethod.pagar_depois || 0) + openOrders.reduce(function(s, o) { return s + o.total; }, 0);

  var text = '*CANTINA ESCOTEIRA*\n';
  text += formatDate(sessionDate) + '\n\n';
  text += '*Total de pedidos:* ' + orders.length + '\n';
  text += '*Total geral:* ' + formatMoney(totalGeral) + '\n\n';
  text += '*Por forma de pagamento:*\n';
  METHODS.forEach(function(m) {
    if (byMethod[m] > 0) {
      text += '  ' + paymentLabel(m) + ': ' + formatMoney(byMethod[m]) + '\n';
    }
  });
  text += '\n*Total nao pago:* ' + formatMoney(unpaidTotal) + '\n';

  var allUnpaid = pendingOrders.concat(openOrders);
  if (allUnpaid.length > 0) {
    text += '\n*Pedidos pendentes:*\n';
    allUnpaid.forEach(function(o) {
      text += '  #' + o.comanda + ' - ' + o.responsavel + ' - ' + formatMoney(o.total) + ' - ' + formatDate(o.session) + '\n';
    });
  }

  if (session && session.cashInitial) {
    var cashSales = byMethod.dinheiro || 0;
    text += '\n*Caixa:*\n';
    text += '  Dinheiro inicial: ' + formatMoney(session.cashInitial) + '\n';
    text += '  Vendas dinheiro: ' + formatMoney(cashSales) + '\n';
    text += '  Esperado: ' + formatMoney(session.cashInitial + cashSales) + '\n';
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('Resumo copiado!');
  } catch (e) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Resumo copiado!');
  }
}
