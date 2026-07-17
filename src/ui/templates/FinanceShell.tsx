import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { container } from '../../app/container';
import { isLeft } from '../../domain/shared/either';
import { MonthPicker } from '../molecules/MonthPicker';
import { useToast } from '../molecules/toast-context';
import { useFinanceMonth } from '../hooks/useFinanceMonth';

interface FinanceTab {
  to: string;
  label: string;
  end?: boolean;
  withMonthPicker: boolean;
}

const FINANCE_TABS: FinanceTab[] = [
  { to: '/finance', label: 'Início', end: true, withMonthPicker: true },
  { to: '/finance/entries', label: 'Lançamentos', withMonthPicker: true },
  { to: '/finance/budget', label: 'Orçamento', withMonthPicker: true },
  { to: '/finance/automations', label: 'Automações', withMonthPicker: false },
  { to: '/finance/projection', label: 'Projeção', withMonthPicker: false },
  { to: '/finance/closings', label: 'Fechamentos', withMonthPicker: true },
  { to: '/finance/settings', label: 'Config', withMonthPicker: false },
];

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-accent font-semibold text-accent'
      : 'border-transparent text-ink-tertiary hover:text-ink-primary',
  ].join(' ');

export function FinanceShell() {
  const toast = useToast();
  const location = useLocation();
  const { month, setMonth } = useFinanceMonth();

  useEffect(() => {
    container.ensureFinanceDefaults().then((result) => {
      if (isLeft(result)) toast(result.left.message, 'error');
    });
  }, [toast]);

  const activeTab = FINANCE_TABS.find((tab) =>
    tab.end
      ? location.pathname === tab.to
      : location.pathname.startsWith(tab.to),
  );
  const showMonthPicker = activeTab?.withMonthPicker ?? false;

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Seções do financeiro"
        className="flex gap-1 overflow-x-auto border-b border-border max-md:-mx-4 max-md:px-4"
      >
        {FINANCE_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={{ pathname: tab.to, search: location.search }}
            end={tab.end}
            className={tabLinkClass}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {showMonthPicker && <MonthPicker value={month} onChange={setMonth} />}
      <Outlet />
    </div>
  );
}
