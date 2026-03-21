import { openDB, ensureSession } from './db.js';
import { formatDate, todayStr, setText } from './helpers.js';
import { renderFooter } from '../components/footer.js';
import { initNavigation, navigateTo } from './navigation.js';
import { loadProducts, initProducts } from './products.js';
import { loadOrders, initOrders } from './orders.js';
import { loadCash, initCash } from './cash.js';
import { loadReports } from './reports.js';

async function init() {
  // Render footer component
  renderFooter('#footer');

  // Open database
  await openDB();

  // Ensure today's session exists
  var session = await ensureSession();
  setText('headerSession', formatDate(todayStr()));

  // Register page load callbacks
  window._loadOrders = loadOrders;
  window._loadProducts = loadProducts;
  window._loadReports = loadReports;
  window._loadCash = loadCash;

  // Init modules
  initNavigation();
  initProducts();
  initOrders();
  initCash();

  // Load initial page
  loadOrders();
}

init();
