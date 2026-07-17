import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  currentMonthKey,
  isValidMonthKey,
} from '../../domain/finance/finance.rules';
import type { MonthKey } from '../../domain/finance/finance.entity';

export interface FinanceMonthState {
  month: MonthKey;
  setMonth(m: MonthKey): void;
}

export function useFinanceMonth(): FinanceMonthState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [fallbackMonth] = useState(() => currentMonthKey(Date.now()));
  const raw = searchParams.get('month') ?? '';
  const month = isValidMonthKey(raw) ? raw : fallbackMonth;

  const setMonth = useCallback(
    (m: MonthKey) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('month', m);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { month, setMonth };
}
