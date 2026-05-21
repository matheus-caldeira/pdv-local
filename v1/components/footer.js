function svgEl(tag, attrs) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
  }
  return el;
}

function makeSvg(children) {
  var svg = svgEl('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' });
  children.forEach(function(c) { svg.appendChild(c); });
  return svg;
}

function iconPedidos() {
  return makeSvg([
    svgEl('path', { d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2' }),
    svgEl('rect', { x: '9', y: '3', width: '6', height: '4', rx: '1' }),
    svgEl('path', { d: 'M9 14l2 2 4-4' })
  ]);
}

function iconProdutos() {
  return makeSvg([
    svgEl('path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z' }),
    svgEl('circle', { cx: '7', cy: '7', r: '1' })
  ]);
}

function iconCaixa() {
  return makeSvg([
    svgEl('path', { d: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' })
  ]);
}

function iconRelatorio() {
  return makeSvg([
    svgEl('path', { d: 'M18 20V10M12 20V4M6 20v-6' })
  ]);
}

var NAV_ITEMS = [
  { page: 'orders', label: 'Pedidos', icon: iconPedidos },
  { page: 'products', label: 'Produtos', icon: iconProdutos },
  { page: 'cash', label: 'Caixa', icon: iconCaixa },
  { page: 'reports', label: 'Relatorio', icon: iconRelatorio }
];

export function renderFooter(containerSelector) {
  var container = document.querySelector(containerSelector || '#footer');
  if (!container) return;

  var nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  NAV_ITEMS.forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'nav-item' + (item.page === 'orders' ? ' active' : '');
    btn.dataset.page = item.page;

    btn.appendChild(item.icon());

    var span = document.createElement('span');
    span.textContent = item.label;
    btn.appendChild(span);

    nav.appendChild(btn);
  });

  container.appendChild(nav);
}
