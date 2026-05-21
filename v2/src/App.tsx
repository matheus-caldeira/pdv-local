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

const BASE = '/escoteiros/v2'

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={BASE}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/cash" element={<Cash />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/customizations" element={<Customizations />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
