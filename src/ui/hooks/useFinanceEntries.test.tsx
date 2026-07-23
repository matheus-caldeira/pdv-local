import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type {
  FinanceEntry,
  MonthClosing,
} from '../../domain/finance/finance.entity';
import {
  EMPTY_FINANCE_ENTRY_FILTERS,
  useFinanceEntries,
} from './useFinanceEntries';

const listFinanceEntries = vi.fn();
const listOverdueFinanceEntries = vi.fn();
const listFinanceCategories = vi.fn();
const listFinanceMembers = vi.fn();
const listFinanceInstallmentPlans = vi.fn();
const listFinanceClosings = vi.fn();
const createFinanceEntry = vi.fn();
const updateFinanceEntry = vi.fn();
const deleteFinanceEntry = vi.fn();
const setFinanceEntryStatus = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listFinanceEntries: (filter: unknown) => listFinanceEntries(filter),
    listOverdueFinanceEntries: (nowMs: number) =>
      listOverdueFinanceEntries(nowMs),
    listFinanceCategories: () => listFinanceCategories(),
    listFinanceMembers: () => listFinanceMembers(),
    listFinanceInstallmentPlans: () => listFinanceInstallmentPlans(),
    listFinanceClosings: () => listFinanceClosings(),
    createFinanceEntry: (input: unknown) => createFinanceEntry(input),
    updateFinanceEntry: (uid: string, input: unknown) =>
      updateFinanceEntry(uid, input),
    deleteFinanceEntry: (uid: string) => deleteFinanceEntry(uid),
    setFinanceEntryStatus: (uid: string, status: string) =>
      setFinanceEntryStatus(uid, status),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeEntry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 1,
    uid: 'entry-1',
    description: 'Conta de luz',
    amount: 120,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: ['member-1'],
    date: Date.UTC(2026, 6, 10, 12),
    month: '2026-07',
    status: 'pending',
    source: 'manual',
    sourceUid: null,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: null,
    invoiceMonth: null,
    invoiceUid: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeClosing(month: string): MonthClosing {
  return {
    id: 1,
    uid: `closing-${month}`,
    month,
    closedAt: 1,
    plannedIncome: 0,
    plannedExpense: 0,
    plannedBalance: 0,
    actualIncome: 0,
    actualExpense: 0,
    actualBalance: 0,
    categories: [],
  };
}

const CATEGORY = {
  id: 1,
  uid: 'cat-1',
  name: 'Moradia',
  kind: 'expense' as const,
  archived: false,
  createdAt: 1,
};

const MEMBER = {
  id: 1,
  uid: 'member-1',
  name: 'Eu',
  archived: false,
  createdAt: 1,
};

const PLAN = {
  id: 1,
  uid: 'plan-1',
  description: 'Geladeira',
  totalAmount: 1000,
  installmentCount: 10,
  firstMonth: '2026-01',
  dayOfMonth: 5,
  kind: 'expense' as const,
  categoryUid: 'cat-1',
  memberUids: ['member-1'],
  createdAt: 1,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderFinanceEntries(month = '2026-07') {
  return renderHook(() => useFinanceEntries(month), { wrapper: Wrapper });
}

describe('useFinanceEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceEntries.mockResolvedValue(right([makeEntry()]));
    listOverdueFinanceEntries.mockResolvedValue(
      right([makeEntry({ uid: 'entry-old', month: '2026-05' })]),
    );
    listFinanceCategories.mockResolvedValue(right([CATEGORY]));
    listFinanceMembers.mockResolvedValue(right([MEMBER]));
    listFinanceInstallmentPlans.mockResolvedValue(right([PLAN]));
    listFinanceClosings.mockResolvedValue(right([makeClosing('2026-05')]));
  });

  afterEach(() => {
    cleanup();
  });

  it('loads entries, options and closings on mount', async () => {
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listFinanceEntries).toHaveBeenCalledWith({ month: '2026-07' });
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.overdueCount).toBe(1);
    expect(result.current.categories).toEqual([CATEGORY]);
    expect(result.current.members).toEqual([MEMBER]);
    expect(result.current.planCounts).toEqual({ 'plan-1': 10 });
    expect(result.current.closedMonths).toEqual(['2026-05']);
    expect(result.current.isMonthClosed).toBe(false);
    expect(result.current.filters).toEqual(EMPTY_FINANCE_ENTRY_FILTERS);
  });

  it('marks the month as closed when a closing exists for it', async () => {
    listFinanceClosings.mockResolvedValue(right([makeClosing('2026-07')]));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.isMonthClosed).toBe(true));
  });

  it('passes every set filter to listFinanceEntries', async () => {
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.setFilters({
        status: 'paid',
        kind: 'expense',
        categoryUid: 'cat-1',
        memberUid: 'member-1',
        text: '  luz  ',
      });
    });
    await waitFor(() =>
      expect(listFinanceEntries).toHaveBeenCalledWith({
        month: '2026-07',
        status: 'paid',
        kind: 'expense',
        categoryUid: 'cat-1',
        memberUid: 'member-1',
        text: 'luz',
      }),
    );
  });

  it('returns overdue entries when overdue mode is on', async () => {
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.setOverdueMode(true);
    });
    await waitFor(() =>
      expect(result.current.entries.map((entry) => entry.uid)).toEqual([
        'entry-old',
      ]),
    );
  });

  it('shows a toast when loading fails', async () => {
    listFinanceEntries.mockResolvedValue(left(new FakeError('falha lista')));
    listOverdueFinanceEntries.mockResolvedValue(
      left(new FakeError('falha atrasadas')),
    );
    listFinanceCategories.mockResolvedValue(
      left(new FakeError('falha categorias')),
    );
    listFinanceMembers.mockResolvedValue(left(new FakeError('falha membros')));
    listFinanceInstallmentPlans.mockResolvedValue(
      left(new FakeError('falha planos')),
    );
    listFinanceClosings.mockResolvedValue(
      left(new FakeError('falha fechamentos')),
    );
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(screen.getByRole('status').textContent).toContain('falha');
    expect(result.current.entries).toEqual([]);
    expect(result.current.categories).toEqual([]);
  });

  it('creates an entry, reloads and toasts on success', async () => {
    createFinanceEntry.mockResolvedValue(right(makeEntry()));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    listFinanceEntries.mockClear();
    const input = {
      description: 'Conta de luz',
      amount: 120,
      categoryUid: 'cat-1',
      memberUids: ['member-1'],
      date: Date.now(),
      status: 'pending' as const,
    };
    let ok = false;
    await act(async () => {
      ok = await result.current.createEntry(input);
    });
    expect(ok).toBe(true);
    expect(createFinanceEntry).toHaveBeenCalledWith(input);
    expect(listFinanceEntries).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Lançamento criado');
  });

  it('returns false and toasts the error when creating fails', async () => {
    createFinanceEntry.mockResolvedValue(left(new FakeError('mês fechado')));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.createEntry({
        description: 'x',
        amount: 1,
        categoryUid: 'cat-1',
        memberUids: ['member-1'],
        date: Date.now(),
        status: 'pending',
      });
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('mês fechado');
  });

  it('updates an entry and toasts on success', async () => {
    updateFinanceEntry.mockResolvedValue(right(makeEntry()));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.updateEntry('entry-1', {
        description: 'Conta de luz',
        amount: 130,
        categoryUid: 'cat-1',
        memberUids: ['member-1'],
        date: Date.now(),
        status: 'paid',
      });
    });
    expect(ok).toBe(true);
    expect(updateFinanceEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ amount: 130 }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Lançamento atualizado',
    );
  });

  it('deletes an entry and toasts on success', async () => {
    deleteFinanceEntry.mockResolvedValue(right(undefined));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.deleteEntry('entry-1');
    });
    expect(ok).toBe(true);
    expect(deleteFinanceEntry).toHaveBeenCalledWith('entry-1');
    expect(screen.getByRole('status')).toHaveTextContent('Lançamento excluído');
  });

  it('marks an entry as paid with the paid toast', async () => {
    setFinanceEntryStatus.mockResolvedValue(
      right(makeEntry({ status: 'paid' })),
    );
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setEntryStatus('entry-1', 'paid');
    });
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'paid');
    expect(screen.getByRole('status')).toHaveTextContent('Marcado como pago');
  });

  it('marks an entry as pending with the pending toast', async () => {
    setFinanceEntryStatus.mockResolvedValue(right(makeEntry()));
    const { result } = renderFinanceEntries();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.setEntryStatus('entry-1', 'pending');
    });
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'pending');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Marcado como pendente',
    );
  });
});
