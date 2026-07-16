import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastProvider } from './ui/molecules/Toast';
import { AppShell } from './ui/templates/AppShell';
import { resolveBasename, DOCS_BASE } from './lib/docsBase';

const DashboardPage = lazy(() =>
  import('./ui/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
);
const PdvPage = lazy(() =>
  import('./ui/pages/PdvPage').then((m) => ({ default: m.PdvPage })),
);
const ProductsPage = lazy(() =>
  import('./ui/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const OrdersPage = lazy(() =>
  import('./ui/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const CashPage = lazy(() =>
  import('./ui/pages/CashPage').then((m) => ({ default: m.CashPage })),
);
const ReportsPage = lazy(() =>
  import('./ui/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import('./ui/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const CustomizationsPage = lazy(() =>
  import('./ui/pages/CustomizationsPage').then((m) => ({
    default: m.CustomizationsPage,
  })),
);
const CustomersPage = lazy(() =>
  import('./ui/pages/CustomersPage').then((m) => ({
    default: m.CustomersPage,
  })),
);
const KdsPage = lazy(() =>
  import('./ui/pages/KdsPage').then((m) => ({ default: m.KdsPage })),
);
const PanelPage = lazy(() =>
  import('./ui/pages/PanelPage').then((m) => ({ default: m.PanelPage })),
);
const NotFoundPage = lazy(() =>
  import('./ui/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const FinanceShell = lazy(() =>
  import('./ui/templates/FinanceShell').then((m) => ({
    default: m.FinanceShell,
  })),
);
const FinanceDashboardPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceDashboardPage,
  })),
);
const FinanceEntriesPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceEntriesPage,
  })),
);
const FinanceBudgetPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceBudgetPage,
  })),
);
const FinanceAutomationsPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceAutomationsPage,
  })),
);
const FinanceProjectionPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceProjectionPage,
  })),
);
const FinanceClosingsPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceClosingsPage,
  })),
);
const FinanceSettingsPage = lazy(() =>
  import('./ui/pages/finance').then((m) => ({
    default: m.FinanceSettingsPage,
  })),
);
const DocsLayout = lazy(() =>
  import('./pages/docs/DocsLayout').then((m) => ({ default: m.DocsLayout })),
);
const DocsPage = lazy(() =>
  import('./pages/docs/DocsPage').then((m) => ({ default: m.DocsPage })),
);

const basename = resolveBasename(window.location.pathname);
const isDocs = basename === DOCS_BASE;

function RouteFallback() {
  return (
    <div className="py-10 text-center text-sm text-ink-tertiary">
      Carregando...
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={basename}>
        {isDocs ? (
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<DocsLayout />}>
                <Route index element={<DocsPage />} />
                <Route path=":slug" element={<DocsPage />} />
              </Route>
            </Routes>
          </Suspense>
        ) : (
          <Routes>
            <Route element={<AppShell />}>
              <Route
                path="/"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/pdv"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PdvPage />
                  </Suspense>
                }
              />
              <Route
                path="/products"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ProductsPage />
                  </Suspense>
                }
              />
              <Route
                path="/orders"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <OrdersPage />
                  </Suspense>
                }
              />
              <Route
                path="/customers"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CustomersPage />
                  </Suspense>
                }
              />
              <Route
                path="/kds"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <KdsPage />
                  </Suspense>
                }
              />
              <Route
                path="/panel"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <PanelPage />
                  </Suspense>
                }
              />
              <Route
                path="/cash"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CashPage />
                  </Suspense>
                }
              />
              <Route
                path="/finance"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <FinanceShell />
                  </Suspense>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceDashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="entries"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceEntriesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="budget"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceBudgetPage />
                    </Suspense>
                  }
                />
                <Route
                  path="automations"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceAutomationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="projection"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceProjectionPage />
                    </Suspense>
                  }
                />
                <Route
                  path="closings"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceClosingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <FinanceSettingsPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path="/reports"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ReportsPage />
                  </Suspense>
                }
              />
              <Route
                path="/customizations"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <CustomizationsPage />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </ToastProvider>
  );
}
