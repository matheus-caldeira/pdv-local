import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Info,
  LayoutDashboard,
  List,
  Lock,
  MonitorPlay,
  Package,
  PiggyBank,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Tv,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleId } from '../domain/modules/module';

export type NavGroupId = 'pdv' | 'products' | 'finance' | 'settings';

export interface NavLinkItem {
  kind: 'link';
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

export interface NavActionItem {
  kind: 'action';
  action: 'about';
  icon: LucideIcon;
  label: string;
}

export type NavItem = NavLinkItem | NavActionItem;

export interface NavGroup {
  id: NavGroupId;
  label: string;
  icon: LucideIcon;
  fixed: boolean;
  items: NavItem[];
  bar: NavItem[];
}

export interface NavModel {
  home: NavLinkItem | null;
  groups: NavGroup[];
}

const link = (
  to: string,
  icon: LucideIcon,
  label: string,
  end?: boolean,
): NavLinkItem => ({ kind: 'link', to, icon, label, end });

const HOME = link('/', LayoutDashboard, 'Início', true);
const SELL = link('/pdv', ShoppingCart, 'Vender');
const ORDERS = link('/orders', ClipboardList, 'Pedidos');
const CASH = link('/cash', Wallet, 'Caixa');
const KDS = link('/kds', MonitorPlay, 'KDS');
const PANEL = link('/panel', Tv, 'Painel');
const REPORTS = link('/reports', BarChart3, 'Relatórios');
const PRODUCTS = link('/products', Package, 'Produtos');
const EXTRAS = link('/customizations', SlidersHorizontal, 'Extras');
const CUSTOMERS = link('/customers', Users, 'Clientes');
const FINANCE_HOME = link('/finance', LayoutDashboard, 'Resumo', true);
const ENTRIES = link('/finance/entries', List, 'Lançamentos');
const BUDGET = link('/finance/budget', Target, 'Orçamento');
const AUTOMATIONS = link('/finance/automations', Zap, 'Automações');
const PROJECTION = link('/finance/projection', TrendingUp, 'Projeção');
const CLOSINGS = link('/finance/closings', Lock, 'Fechamentos');
const INVOICES = link('/finance/invoices', CreditCard, 'Faturas');
const SETTINGS = link('/settings', Settings, 'Configurações');
const FINANCE_SETTINGS = link(
  '/finance/settings',
  SlidersHorizontal,
  'Config. do Financeiro',
);
const ABOUT: NavActionItem = {
  kind: 'action',
  action: 'about',
  icon: Info,
  label: 'Sobre e contato',
};

export function buildNavModel(
  modules: ModuleId[],
  statusControlEnabled: boolean,
): NavModel {
  const hasPdv = modules.includes('pdv');
  const hasFinance = modules.includes('finance');
  const single = modules.length === 1;
  const groups: NavGroup[] = [];

  if (hasPdv) {
    groups.push({
      id: 'pdv',
      label: 'Ponto de Venda',
      icon: ShoppingCart,
      fixed: single,
      items: [
        SELL,
        ORDERS,
        CASH,
        ...(statusControlEnabled ? [KDS, PANEL] : []),
        REPORTS,
      ],
      bar: [HOME, SELL, ORDERS, CASH],
    });
    groups.push({
      id: 'products',
      label: 'Cadastros',
      icon: Package,
      fixed: false,
      items: [CUSTOMERS, PRODUCTS, EXTRAS],
      bar: [CUSTOMERS, PRODUCTS, EXTRAS],
    });
  }

  if (hasFinance) {
    groups.push({
      id: 'finance',
      label: 'Financeiro',
      icon: PiggyBank,
      fixed: single,
      items: [
        FINANCE_HOME,
        ENTRIES,
        BUDGET,
        AUTOMATIONS,
        PROJECTION,
        CLOSINGS,
        INVOICES,
      ],
      bar: [FINANCE_HOME, ENTRIES, BUDGET, CLOSINGS],
    });
  }

  const settingsItems: NavItem[] = [
    SETTINGS,
    ...(hasFinance ? [FINANCE_SETTINGS] : []),
    ABOUT,
  ];
  groups.push({
    id: 'settings',
    label: 'Configurações',
    icon: Settings,
    fixed: false,
    items: settingsItems,
    bar: settingsItems,
  });

  return { home: hasPdv ? HOME : null, groups };
}

export function resolveActiveGroup(
  pathname: string,
  model: NavModel,
): NavGroup {
  if (pathname === '/') {
    const home = model.groups.find((group) => group.id === 'pdv');
    return model.home && home ? home : model.groups[0];
  }

  let best: { group: NavGroup; length: number } | null = null;
  for (const group of model.groups) {
    for (const item of group.items) {
      if (item.kind !== 'link') continue;
      if (item.to === pathname) return group;
      if (
        pathname.startsWith(`${item.to}/`) &&
        (best === null || item.to.length > best.length)
      ) {
        best = { group, length: item.to.length };
      }
    }
  }
  return best?.group ?? model.groups[0];
}

export function resolveActiveGroupId(
  pathname: string,
  model: NavModel,
): NavGroupId {
  return resolveActiveGroup(pathname, model).id;
}

export function preserveSearch(pathname: string, to: string): boolean {
  return pathname.startsWith('/finance') && to.startsWith('/finance');
}
