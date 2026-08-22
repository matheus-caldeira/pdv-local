import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Info, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '../lib/cn';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed';
import { formatTime } from '../../domain/shared/format';
import type { Session } from '../../domain/cash/cash.entity';
import {
  preserveSearch,
  type NavGroupId,
  type NavItem,
  type NavModel,
} from '../../app/nav-model';
import { NavAccordionGroup } from '../molecules/NavAccordionGroup';
import { ContactModal } from '../organisms/ContactModal';

const LOGO_URL = `${import.meta.env.BASE_URL}logo.png`;

export interface AppShellProps {
  model: NavModel;
  activeGroupId: NavGroupId;
  bottomBar: NavItem[];
  activeSession: Session | null;
}

const homeLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-accent-subtle text-accent'
      : 'text-ink-primary hover:bg-surface-inset',
  ].join(' ');

const compactHomeLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center justify-center rounded-md py-2.5 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-accent-subtle text-accent'
      : 'text-ink-primary hover:bg-surface-inset',
  ].join(' ');

const bottomLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 text-[10px] font-medium transition-colors',
    isActive ? 'text-accent' : 'text-ink-muted',
  ].join(' ');

export function AppShell({
  model,
  activeGroupId,
  bottomBar,
  activeSession,
}: AppShellProps) {
  const location = useLocation();
  const [expandedGroupId, setExpandedGroupId] =
    useState<NavGroupId>(activeGroupId);
  const [syncedGroupId, setSyncedGroupId] = useState<NavGroupId>(activeGroupId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  if (syncedGroupId !== activeGroupId) {
    setSyncedGroupId(activeGroupId);
    setExpandedGroupId(activeGroupId);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setDrawerOpen(false);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const searchFor = (to: string) =>
    preserveSearch(location.pathname, to) ? location.search : '';

  const openAbout = () => {
    setDrawerOpen(false);
    setInfoOpen(true);
  };

  const groupList = (onNavigate: () => void, compact = false) => (
    <>
      {model.home && (
        <NavLink
          to={model.home.to}
          end
          className={compact ? compactHomeLinkClass : homeLinkClass}
          title={compact ? model.home.label : undefined}
          onClick={onNavigate}
        >
          <model.home.icon size={18} strokeWidth={2} />
          <span className={compact ? 'sr-only' : undefined}>
            {model.home.label}
          </span>
        </NavLink>
      )}
      {model.groups.map((group) => (
        <NavAccordionGroup
          key={group.id}
          group={group}
          expanded={group.fixed || expandedGroupId === group.id}
          onToggle={(id) =>
            setExpandedGroupId((current) => (current === id ? current : id))
          }
          searchFor={searchFor}
          onNavigate={onNavigate}
          onAction={openAbout}
          compact={compact}
        />
      ))}
    </>
  );

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="Menu principal"
        className={cn(
          'fixed inset-y-0 left-0 z-[100] flex flex-col gap-1 overflow-y-auto border-r border-border bg-surface-0 py-4 transition-[width] max-md:hidden',
          collapsed
            ? 'w-[var(--nav-sidebar-collapsed-width)] px-2'
            : 'w-[var(--nav-sidebar-width)] px-2',
        )}
      >
        {collapsed ? (
          <button
            type="button"
            className="mb-3 flex items-center justify-center rounded-md py-2.5 text-ink-secondary transition-colors hover:bg-surface-inset hover:text-ink-primary"
            aria-label="Expandir menu"
            title="Expandir menu"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeftOpen size={20} strokeWidth={2} />
          </button>
        ) : (
          <div className="mb-3 flex items-center gap-2 py-2 pr-1 pl-3">
            <img
              src={LOGO_URL}
              alt="Meu Bolso"
              className="h-9 w-9 object-contain"
            />
            <span className="flex-1 text-base font-bold">Meu Bolso</span>
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-tertiary transition-colors hover:bg-surface-inset hover:text-ink-primary"
              aria-label="Recolher menu"
              title="Recolher menu"
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose size={18} strokeWidth={2} />
            </button>
          </div>
        )}
        {groupList(() => {}, collapsed)}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {activeSession &&
            (collapsed ? (
              <div
                className="flex justify-center py-2"
                title={`Caixa aberto desde ${formatTime(activeSession.openedAt)}`}
              >
                <div className="h-2 w-2 rounded-full bg-success" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-ink-tertiary">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>
                  Caixa aberto desde {formatTime(activeSession.openedAt)}
                </span>
              </div>
            ))}
          <button
            type="button"
            className={cn(
              'flex items-center rounded-md text-sm font-medium text-ink-tertiary transition-colors hover:bg-surface-inset hover:text-ink-primary',
              collapsed ? 'justify-center py-2.5' : 'gap-3 px-4 py-2',
            )}
            title={collapsed ? 'Sobre e contato' : undefined}
            onClick={() => setInfoOpen(true)}
          >
            <Info size={18} strokeWidth={2} />
            <span className={collapsed ? 'sr-only' : undefined}>
              Sobre e contato
            </span>
          </button>
        </div>
      </nav>

      <main
        className={cn(
          'min-w-0 flex-1 p-6 pb-8 transition-[margin] max-md:ml-0 max-md:p-4 max-md:pb-[calc(var(--nav-bottom-height)+1rem+env(safe-area-inset-bottom,0px))] [&>*]:mx-auto [&>*]:max-w-[1200px]',
          collapsed
            ? 'ml-[var(--nav-sidebar-collapsed-width)]'
            : 'ml-[var(--nav-sidebar-width)]',
        )}
      >
        <Outlet />
      </main>

      <nav
        aria-label="Menu do módulo"
        className="fixed inset-x-0 bottom-0 z-[100] hidden border-t border-border bg-surface-2 pb-[env(safe-area-inset-bottom,0px)] max-md:flex"
      >
        {bottomBar.map((item) =>
          item.kind === 'link' ? (
            <NavLink
              key={item.to}
              to={{ pathname: item.to, search: searchFor(item.to) }}
              end={item.end}
              className={bottomLinkClass}
            >
              <item.icon size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ) : (
            <button
              key={item.action}
              type="button"
              className="flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 text-[10px] font-medium text-ink-muted transition-colors"
              onClick={openAbout}
            >
              <item.icon size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </button>
          ),
        )}
        <button
          type="button"
          className={[
            'flex flex-1 flex-col items-center gap-0.5 px-1 pt-2 pb-3 text-[10px] font-medium transition-colors',
            drawerOpen ? 'text-accent' : 'text-ink-muted',
          ].join(' ')}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <Menu size={22} strokeWidth={2} />
          <span>Módulos</span>
        </button>
      </nav>

      {drawerOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-[300] bg-ink-primary/45"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Módulos"
            className="absolute inset-y-0 right-0 flex w-[280px] max-w-[80vw] flex-col bg-surface-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="flex items-center text-lg font-bold">
                <img
                  src={LOGO_URL}
                  alt="Meu Bolso"
                  className="mr-2 h-7 w-7 object-contain align-middle"
                />
                Módulos
              </span>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md border border-border-emphasis bg-surface-2 text-ink-secondary transition-colors hover:bg-surface-inset"
                aria-label="Fechar menu"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
              {groupList(() => setDrawerOpen(false))}
            </div>
            {activeSession && (
              <div className="flex items-center gap-2 border-t border-border px-5 py-4 text-sm text-ink-tertiary">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                Sessão aberta desde {formatTime(activeSession.openedAt)}
              </div>
            )}
          </div>
        </div>
      )}

      <ContactModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
