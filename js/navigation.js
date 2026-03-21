import { saveCurrentOrder } from './orders.js';

var currentPage = 'orders';
var navigationStack = [];

export function getCurrentPage() {
  return currentPage;
}

export function navigateTo(pageName, opts) {
  var pushState = !(opts && opts.skipPush);
  var pages = document.querySelectorAll('.page');
  var navItems = document.querySelectorAll('.nav-item');

  pages.forEach(function(p) { p.classList.remove('active'); });
  navItems.forEach(function(n) { n.classList.remove('active'); });

  var pageEl = document.getElementById('page-' + pageName);
  if (pageEl) pageEl.classList.add('active');

  var navEl = document.querySelector('[data-page="' + pageName + '"]');
  if (navEl) navEl.classList.add('active');

  // Hide total bar when leaving order edit
  var totalBar = document.getElementById('totalBar');
  if (pageName !== 'order-edit') {
    totalBar.style.display = 'none';
  }

  if (pushState && pageName !== currentPage) {
    navigationStack.push(currentPage);
    history.pushState({ page: pageName }, '', '#' + pageName);
  }

  currentPage = pageName;

  // Trigger page load callbacks
  if (pageName === 'orders' && window._loadOrders) window._loadOrders();
  if (pageName === 'products' && window._loadProducts) window._loadProducts();
  if (pageName === 'reports' && window._loadReports) window._loadReports();
  if (pageName === 'cash' && window._loadCash) window._loadCash();
}

export function goBack() {
  // If on order edit, save before leaving
  if (currentPage === 'order-edit') {
    saveCurrentOrder();
  }

  // Close any open modal first
  var openModals = document.querySelectorAll('.modal-overlay.open');
  if (openModals.length > 0) {
    openModals.forEach(function(m) { m.classList.remove('open'); });
    return;
  }

  // If on orders page with active search, clear search first
  if (currentPage === 'orders') {
    var searchInput = document.getElementById('orderSearch');
    if (searchInput && searchInput.value.trim()) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      return;
    }
  }

  // Navigate back
  if (currentPage !== 'orders') {
    navigateTo('orders', { skipPush: true });
  }
}

export function initNavigation() {
  // Bottom nav clicks
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.addEventListener('click', function() {
      navigateTo(item.dataset.page);
    });
  });

  // Browser back button
  window.addEventListener('popstate', function() {
    goBack();
  });

  // Set initial state
  history.replaceState({ page: 'orders' }, '', '#orders');
}
