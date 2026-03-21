import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { formatTime } from '../utils/format'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/pdv', icon: ShoppingCart, label: 'Vender' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/cash', icon: Wallet, label: 'Caixa' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export function Layout() {
  const { activeSession } = useSession()

  return (
    <div className="layout">
      {/* Desktop rail */}
      <nav className="nav-rail">
        <div className="nav-rail-brand">PDV</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-rail-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {activeSession && (
          <div className="nav-rail-session">
            <div className="session-dot" />
            <span>{formatTime(activeSession.openedAt)}</span>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="nav-bottom">
        {NAV_ITEMS.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-bottom-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={22} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
