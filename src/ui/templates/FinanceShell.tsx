import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { container } from '../../app/container';
import { isLeft } from '../../domain/shared/either';
import { MonthPicker } from '../molecules/MonthPicker';
import { useToast } from '../molecules/toast-context';
import { useFinanceMonth } from '../hooks/useFinanceMonth';

const MONTH_PICKER_ROUTES = [
  { path: '/finance', end: true },
  { path: '/finance/entries', end: false },
  { path: '/finance/budget', end: false },
  { path: '/finance/closings', end: false },
];

export function FinanceShell() {
  const toast = useToast();
  const location = useLocation();
  const { month, setMonth } = useFinanceMonth();

  useEffect(() => {
    container.ensureFinanceDefaults().then((result) => {
      if (isLeft(result)) toast(result.left.message, 'error');
    });
  }, [toast]);

  const showMonthPicker = MONTH_PICKER_ROUTES.some((route) =>
    route.end
      ? location.pathname === route.path
      : location.pathname.startsWith(route.path),
  );

  return (
    <div className="flex flex-col gap-4">
      {showMonthPicker && <MonthPicker value={month} onChange={setMonth} />}
      <Outlet />
    </div>
  );
}
