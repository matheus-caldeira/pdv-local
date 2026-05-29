import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
import type { LucideIcon } from 'lucide-react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import { formatTime } from '../../domain/shared/format';
import { useSession } from '../hooks/useSession';
import { useToast } from '../molecules/toast-context';
import { ContactModal } from '../organisms/ContactModal';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
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

const MOBILE_TABS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[3],
  NAV_ITEMS[6],
];

const railLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex w-[calc(var(--nav-rail-width)-1rem)] flex-col items-center gap-0.5 rounded-md px-3 py-2 text-center text-[10px] font-medium transition-colors',
    isActive
      ? 'bg-accent-subtle text-accent'
      : 'text-ink-tertiary hover:bg-surface-inset hover:text-ink-primary',
  ].join(' ');

const bottomLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 text-[10px] font-medium transition-colors',
    isActive ? 'text-accent' : 'text-ink-muted',
  ].join(' ');

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium transition-colors',
    isActive
      ? 'bg-accent-subtle font-semibold text-accent'
      : 'text-ink-secondary active:bg-surface-inset',
  ].join(' ');

export function AppShell() {
  const { activeSession } = useSession();
  const location = useLocation();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusControl, setStatusControl] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSidebarOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    container.readConfig().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (config) => setStatusControl(config.statusControlEnabled),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, toast]);

  const navItems: NavItem[] = statusControl
    ? [
        ...NAV_ITEMS.slice(0, 5),
        { to: '/kds', icon: MonitorPlay, label: 'KDS' },
        { to: '/panel', icon: Tv, label: 'Painel' },
        ...NAV_ITEMS.slice(5),
      ]
    : NAV_ITEMS;

  return (
    <div className="flex min-h-dvh">
      <nav className="fixed inset-y-0 left-0 z-[100] flex w-[var(--nav-rail-width)] flex-col items-center gap-1 border-r border-border bg-surface-0 py-4 max-md:hidden">
        <div className="mb-4 flex items-center justify-center py-2">
          <img
            src={LOGO_URL}
            alt="PDV Local"
            className="h-10 w-10 object-contain"
          />
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={railLinkClass}
          >
            <item.icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2 pt-2">
          {activeSession && (
            <div className="flex flex-col items-center gap-1 p-2 text-xs text-ink-tertiary">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>{formatTime(activeSession.openedAt)}</span>
            </div>
          )}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-2 text-ink-tertiary transition-colors hover:border-accent hover:text-accent"
            onClick={() => setInfoOpen(true)}
            aria-label="Sobre e contato"
            title="Sobre e contato"
          >
            <Info size={18} strokeWidth={2} />
          </button>
        </div>
      </nav>

      <main className="ml-[var(--nav-rail-width)] min-w-0 flex-1 p-6 pb-8 max-md:ml-0 max-md:p-4 max-md:pb-[calc(var(--nav-bottom-height)+1rem+env(safe-area-inset-bottom,0px))] [&>*]:mx-auto [&>*]:max-w-[1200px]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[100] hidden border-t border-border bg-surface-2 pb-[env(safe-area-inset-bottom,0px)] max-md:flex">
        {MOBILE_TABS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={bottomLinkClass}
          >
            <item.icon size={22} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={[
            'flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 text-[10px] font-medium transition-colors',
            sidebarOpen ? 'text-accent' : 'text-ink-muted',
          ].join(' ')}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <Menu size={22} strokeWidth={2} />
          <span>Mais</span>
        </button>
      </nav>

      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[300] bg-ink-primary/45"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-[280px] max-w-[80vw] flex-col bg-surface-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="flex items-center text-lg font-bold">
                <img
                  src={LOGO_URL}
                  alt="PDV Local"
                  className="mr-2 h-7 w-7 object-contain align-middle"
                />
                Menu
              </span>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md border border-border-emphasis bg-surface-2 text-ink-secondary transition-colors hover:bg-surface-inset"
                aria-label="Fechar menu"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={sidebarLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
            {activeSession && (
              <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-sm text-ink-tertiary">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                Sessao aberta desde {formatTime(activeSession.openedAt)}
              </div>
            )}
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium text-ink-secondary transition-colors active:bg-surface-inset"
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
