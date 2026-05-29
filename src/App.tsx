import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './ui/molecules/Toast';
import { AppShell } from './ui/templates/AppShell';
import { DashboardPage } from './ui/pages/DashboardPage';
import { PdvPage } from './ui/pages/PdvPage';
import { ProductsPage } from './ui/pages/ProductsPage';
import { OrdersPage } from './ui/pages/OrdersPage';
import { CashPage } from './ui/pages/CashPage';
import { ReportsPage } from './ui/pages/ReportsPage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { CustomizationsPage } from './ui/pages/CustomizationsPage';
import { CustomersPage } from './ui/pages/CustomersPage';
import { KdsPage } from './ui/pages/KdsPage';
import { PanelPage } from './ui/pages/PanelPage';
import { NotFoundPage } from './ui/pages/NotFoundPage';
import { DocsLayout } from './pages/docs/DocsLayout';
import { DocsPage } from './pages/docs/DocsPage';
import { resolveBasename, DOCS_BASE } from './lib/docsBase';

const basename = resolveBasename(window.location.pathname);
const isDocs = basename === DOCS_BASE;

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={basename}>
        {isDocs ? (
          <Routes>
            <Route element={<DocsLayout />}>
              <Route index element={<DocsPage />} />
              <Route path=":slug" element={<DocsPage />} />
            </Route>
          </Routes>
        ) : (
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pdv" element={<PdvPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/kds" element={<KdsPage />} />
              <Route path="/panel" element={<PanelPage />} />
              <Route path="/cash" element={<CashPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/customizations" element={<CustomizationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </ToastProvider>
  );
}
