import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ToastProvider as UiToastProvider } from './ui/molecules/Toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { PdvPage } from './ui/pages/PdvPage';
import { ProductsPage } from './ui/pages/ProductsPage';
import { OrdersPage } from './ui/pages/OrdersPage';
import { CashPage } from './ui/pages/CashPage';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { CustomizationsPage } from './ui/pages/CustomizationsPage';
import { CustomersPage } from './ui/pages/CustomersPage';
import { KdsPage } from './ui/pages/KdsPage';
import { PanelPage } from './ui/pages/PanelPage';
import { NotFound } from './pages/NotFound';
import { DocsLayout } from './pages/docs/DocsLayout';
import { DocsPage } from './pages/docs/DocsPage';
import { resolveBasename, DOCS_BASE } from './lib/docsBase';

// A docs e o app compartilham o mesmo bundle. O prefixo da URL atual decide
// qual basename usar — e, portanto, qual conjunto de rotas fica acessível.
const basename = resolveBasename(window.location.pathname);
const isDocs = basename === DOCS_BASE;

export function App() {
  return (
    <ToastProvider>
      <UiToastProvider>
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
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pdv" element={<PdvPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/kds" element={<KdsPage />} />
                <Route path="/panel" element={<PanelPage />} />
                <Route path="/cash" element={<CashPage />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                  path="/customizations"
                  element={<CustomizationsPage />}
                />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          )}
        </BrowserRouter>
      </UiToastProvider>
    </ToastProvider>
  );
}
