import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Wallet,
  BarChart3,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { formatTime } from '../utils/format'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/pdv', icon: ShoppingCart, label: 'Vender' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/customizations', icon: SlidersHorizontal, label: 'Extras' },
  { to: '/cash', icon: Wallet, label: 'Caixa' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export function Layout() {
  const { activeSession } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  // Push an initial history entry so back doesn't leave the app
  useEffect(() => {
    // If we're on the home page, push a dummy entry so back stays in the app
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      // If not on home, go to home
      if (location.pathname !== '/') {
        navigate('/', { replace: true })
      } else {
        // On home, push state again to prevent leaving
        window.history.pushState(null, '', window.location.href)
      }
    }

    // Push initial state to trap back button
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [location.pathname, navigate])

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

      {/* Mobile bottom tabs — show key items + config via "Mais" */}
      <nav className="nav-bottom">
        {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[3], NAV_ITEMS[5], NAV_ITEMS[7]].map(item => (
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
