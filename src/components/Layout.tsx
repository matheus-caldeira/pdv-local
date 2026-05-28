import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  MonitorPlay,
  Tv,
  Wallet,
  BarChart3,
  Settings,
  SlidersHorizontal,
  Menu,
  X,
  Info,
} from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { getConfig } from '../db/database';
import { formatTime } from '../utils/format';
import { ContactModal } from './ContactModal';
import './Layout.css';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', end: true },
  { to: '/pdv', icon: ShoppingCart, label: 'Vender' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/customizations', icon: SlidersHorizontal, label: 'Extras' },
  { to: '/cash', icon: Wallet, label: 'Caixa' },
  { to: '/reports', icon: BarChart3, label: 'Relatorios' },
  { to: '/settings', icon: Settings, label: 'Config' },
];

const MOBILE_TABS = [
  NAV_ITEMS[0], // Inicio
  NAV_ITEMS[1], // Vender
  NAV_ITEMS[3], // Pedidos
  NAV_ITEMS[6], // Caixa
];

export function Layout() {
  const { activeSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusControl, setStatusControl] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (sidebarOpen) {
        setSidebarOpen(false);
        window.history.pushState(null, '', window.location.href);
        return;
      }
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      } else {
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname, navigate, sidebarOpen]);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    getConfig().then((c) => setStatusControl(c.statusControlEnabled));
  }, [location.pathname]);

  const navItems = statusControl
    ? [
        ...NAV_ITEMS.slice(0, 5), // ate Clientes (indices 0-4)
        { to: '/kds', icon: MonitorPlay, label: 'KDS' },
        { to: '/panel', icon: Tv, label: 'Painel' },
        ...NAV_ITEMS.slice(5), // Extras em diante (indices 5+)
      ]
    : NAV_ITEMS;

  return (
    <div className="layout">
      {/* Desktop rail */}
      <nav className="nav-rail">
        <div className="nav-rail-brand">
          <img src={LOGO_URL} alt="PDV Local" className="nav-rail-logo" />
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-rail-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="nav-rail-footer">
          {activeSession && (
            <div className="nav-rail-session">
              <div className="session-dot" />
              <span>{formatTime(activeSession.openedAt)}</span>
            </div>
          )}
          <button
            className="nav-rail-info"
            onClick={() => setInfoOpen(true)}
            aria-label="Sobre e contato"
            title="Sobre e contato"
          >
            <Info size={18} strokeWidth={2} />
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="nav-bottom">
        {MOBILE_TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-bottom-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={22} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          className={`nav-bottom-item ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={22} strokeWidth={2} />
          <span>Mais</span>
        </button>
      </nav>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <span className="sidebar-title">
                <img src={LOGO_URL} alt="PDV Local" className="sidebar-logo" />
                Menu
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="sidebar-items">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            {activeSession && (
              <div className="sidebar-session">
                <div className="session-dot-sm" />
                Sessao aberta desde {formatTime(activeSession.openedAt)}
              </div>
            )}
            <button
              className="sidebar-item"
              onClick={() => {
                setSidebarOpen(false);
                setInfoOpen(true);
              }}
            >
              <Info size={20} strokeWidth={2} />
              <span>Sobre e contato</span>
            </button>
          </div>
        </div>
      )}

      <ContactModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
