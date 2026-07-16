import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useFinanceDashboard } from './useFinanceDashboard';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { FinanceDashboard } from '../../application/finance/dashboard.usecases';
import type {
  EntryStatus,
  MonthKey,
} from '../../domain/finance/finance.entity';

const ensureFinanceDefaults = vi.fn();
const loadFinanceDashboard = vi.fn();
const setFinanceEntryStatus = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    ensureFinanceDefaults: () => ensureFinanceDefaults(),
    loadFinanceDashboard: (month: string, nowMs: number) =>
      loadFinanceDashboard(month, nowMs),
    setFinanceEntryStatus: (uid: string, status: string) =>
      setFinanceEntryStatus(uid, status),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const EMPTY_DASHBOARD: FinanceDashboard = {
  currentBalance: 0,
  summary: {
    plannedIncome: 0,
    plannedExpense: 0,
    plannedBalance: 0,
    actualIncome: 0,
    actualExpense: 0,
    actualBalance: 0,
    categories: [],
  },
  overdueEntries: [],
  overdueTotal: 0,
  pendingThisMonth: [],
  memberInvolvement: [],
};

function Probe({ month }: { month: MonthKey }) {
  const { dashboard, loading, setEntryStatus } = useFinanceDashboard(month);
  const act = (status: EntryStatus) => setEntryStatus('entry-1', status);
  return (
    <div>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <span>has:{dashboard ? 'yes' : 'no'}</span>
      <button onClick={() => act('paid')}>pay</button>
      <button onClick={() => act('pending')}>unpay</button>
    </div>
  );
}

function Host() {
  const [month, setMonth] = useState<MonthKey>('2026-07');
  return (
    <div>
      <Probe month={month} />
      <button onClick={() => setMonth('2026-08')}>next</button>
    </div>
  );
}

function renderHost() {
  return render(
    <ToastProvider>
      <Host />
    </ToastProvider>,
  );
}

describe('useFinanceDashboard', () => {
  beforeEach(() => {
    ensureFinanceDefaults.mockReset();
    loadFinanceDashboard.mockReset();
    setFinanceEntryStatus.mockReset();
    ensureFinanceDefaults.mockResolvedValue(right(undefined));
    loadFinanceDashboard.mockResolvedValue(right(EMPTY_DASHBOARD));
  });
  afterEach(cleanup);

  it('ensures defaults and loads the dashboard on mount', async () => {
    renderHost();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(ensureFinanceDefaults).toHaveBeenCalledTimes(1);
    expect(loadFinanceDashboard).toHaveBeenCalledWith(
      '2026-07',
      expect.any(Number),
    );
    expect(screen.getByText('has:yes')).toBeInTheDocument();
  });

  it('exposes loading while the dashboard is being fetched', async () => {
    loadFinanceDashboard.mockReturnValue(new Promise(() => {}));
    renderHost();
    await waitFor(() => expect(loadFinanceDashboard).toHaveBeenCalled());
    expect(screen.getByText('loading:yes')).toBeInTheDocument();
  });

  it('ensures defaults only once across month changes', async () => {
    renderHost();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('next'));
    await waitFor(() =>
      expect(loadFinanceDashboard).toHaveBeenCalledWith(
        '2026-08',
        expect.any(Number),
      ),
    );
    expect(ensureFinanceDefaults).toHaveBeenCalledTimes(1);
  });

  it('toasts when ensuring defaults fails and still loads the dashboard', async () => {
    ensureFinanceDefaults.mockResolvedValue(
      left(new FakeError('falha nos padrões')),
    );
    renderHost();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha nos padrões'),
    );
    await waitFor(() =>
      expect(screen.getByText('has:yes')).toBeInTheDocument(),
    );
  });

  it('toasts when loading fails and keeps the dashboard empty', async () => {
    loadFinanceDashboard.mockResolvedValue(left(new FakeError('falha painel')));
    renderHost();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha painel'),
    );
    expect(screen.getByText('has:no')).toBeInTheDocument();
  });

  it('marks an entry as paid and reloads', async () => {
    setFinanceEntryStatus.mockResolvedValue(right({ uid: 'entry-1' }));
    renderHost();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('pay'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Lançamento marcado como pago',
      ),
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'paid');
    expect(loadFinanceDashboard).toHaveBeenCalledTimes(2);
  });

  it('undoes a payment with its own message', async () => {
    setFinanceEntryStatus.mockResolvedValue(right({ uid: 'entry-1' }));
    renderHost();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('unpay'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pagamento desfeito',
      ),
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'pending');
  });

  it('toasts when changing the status fails and does not reload', async () => {
    setFinanceEntryStatus.mockResolvedValue(left(new FakeError('mês fechado')));
    renderHost();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('pay'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês fechado'),
    );
    expect(loadFinanceDashboard).toHaveBeenCalledTimes(1);
  });
});
