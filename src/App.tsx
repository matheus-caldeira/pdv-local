import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PDV } from './pages/PDV'
import { Products } from './pages/Products'
import { Orders } from './pages/Orders'
import { Cash } from './pages/Cash'
import { Reports } from './pages/Reports'
import { Settings } from './pages/Settings'
import { Customizations } from './pages/Customizations'
import { Customers } from './pages/Customers'
import { Kds } from './pages/Kds'
import { Panel } from './pages/Panel'
import { NotFound } from './pages/NotFound'
import { DocsLayout } from './pages/docs/DocsLayout'
import { DocsPage } from './pages/docs/DocsPage'
import { resolveBasename, DOCS_BASE } from './lib/docsBase'

// A docs e o app compartilham o mesmo bundle. O prefixo da URL atual decide
// qual basename usar — e, portanto, qual conjunto de rotas fica acessível.
const basename = resolveBasename(window.location.pathname)
const isDocs = basename === DOCS_BASE

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
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pdv" element={<PDV />} />
              <Route path="/products" element={<Products />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/kds" element={<Kds />} />
              <Route path="/panel" element={<Panel />} />
              <Route path="/cash" element={<Cash />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/customizations" element={<Customizations />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        )}
      </BrowserRouter>
    </ToastProvider>
  )
}
