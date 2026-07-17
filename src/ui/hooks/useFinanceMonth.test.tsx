import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useFinanceMonth } from './useFinanceMonth';
import { currentMonthKey } from '../../domain/finance/finance.rules';

function wrapperFor(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
    );
  };
}

function renderFinanceMonth(initialEntry: string) {
  return renderHook(
    () => ({ state: useFinanceMonth(), location: useLocation() }),
    { wrapper: wrapperFor(initialEntry) },
  );
}

describe('useFinanceMonth', () => {
  afterEach(() => {
    cleanup();
  });

  it('reads a valid month from the URL', () => {
    const { result } = renderFinanceMonth('/finance?month=2026-05');
    expect(result.current.state.month).toBe('2026-05');
  });

  it('falls back to the current month when the param is missing', () => {
    const { result } = renderFinanceMonth('/finance');
    expect(result.current.state.month).toBe(currentMonthKey(Date.now()));
  });

  it('falls back to the current month when the param is invalid', () => {
    const { result } = renderFinanceMonth('/finance?month=banana');
    expect(result.current.state.month).toBe(currentMonthKey(Date.now()));
  });

  it('writes the month to the URL preserving other params', () => {
    const { result } = renderFinanceMonth('/finance?foo=1');
    act(() => {
      result.current.state.setMonth('2026-02');
    });
    expect(result.current.state.month).toBe('2026-02');
    const params = new URLSearchParams(result.current.location.search);
    expect(params.get('month')).toBe('2026-02');
    expect(params.get('foo')).toBe('1');
  });
});
