import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { DashboardData } from '../../application/report/report.usecases';

const loadDashboard = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadDashboard: (id: number) => loadDashboard(id),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const DATA: DashboardData = {
  summary: {
    totalSales: 100,
    totalCost: 40,
    profit: 60,
    margin: 60,
    paidCount: 3,
  },
  openCount: 2,
  topProducts: [{ name: 'X', qty: 1, total: 10, cost: 4 }],
  recent: [],
};

function Probe({ sessionId }: { sessionId: number | undefined }) {
  const { data } = useDashboard(sessionId);
  return <span>sales:{data ? data.summary.totalSales : 'none'}</span>;
}

function renderProbe(sessionId: number | undefined) {
  return render(
    <ToastProvider>
      <Probe sessionId={sessionId} />
    </ToastProvider>,
  );
}

describe('useDashboard', () => {
  beforeEach(() => {
    loadDashboard.mockReset();
    loadDashboard.mockResolvedValue(right(DATA));
  });
  afterEach(cleanup);

  it('keeps data null and does not load without a session', async () => {
    renderProbe(undefined);
    await waitFor(() =>
      expect(screen.getByText('sales:none')).toBeInTheDocument(),
    );
    expect(loadDashboard).not.toHaveBeenCalled();
  });

  it('loads the dashboard for the given session', async () => {
    renderProbe(7);
    await waitFor(() =>
      expect(screen.getByText('sales:100')).toBeInTheDocument(),
    );
    expect(loadDashboard).toHaveBeenCalledWith(7);
  });

  it('reloads when the session changes', async () => {
    const { rerender } = renderProbe(1);
    await waitFor(() => expect(loadDashboard).toHaveBeenCalledWith(1));
    rerender(
      <ToastProvider>
        <Probe sessionId={2} />
      </ToastProvider>,
    );
    await waitFor(() => expect(loadDashboard).toHaveBeenCalledWith(2));
  });

  it('clears data when the session becomes undefined', async () => {
    const { rerender } = renderProbe(1);
    await waitFor(() =>
      expect(screen.getByText('sales:100')).toBeInTheDocument(),
    );
    rerender(
      <ToastProvider>
        <Probe sessionId={undefined} />
      </ToastProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText('sales:none')).toBeInTheDocument(),
    );
  });

  it('toasts when loading fails', async () => {
    loadDashboard.mockResolvedValue(left(new FakeError('falha painel')));
    renderProbe(5);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha painel'),
    );
    expect(screen.getByText('sales:none')).toBeInTheDocument();
  });

  it('ignores a resolved load after unmount', async () => {
    let resolveLoad: (value: ReturnType<typeof right>) => void = () => {};
    loadDashboard.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const { unmount } = renderProbe(3);
    await waitFor(() => expect(loadDashboard).toHaveBeenCalledWith(3));
    unmount();
    resolveLoad(right(DATA));
    await Promise.resolve();
    expect(screen.queryByText('sales:100')).not.toBeInTheDocument();
  });

  it('ignores the clear microtask after unmount', async () => {
    const { unmount } = renderProbe(undefined);
    unmount();
    await Promise.resolve();
    expect(screen.queryByText('sales:none')).not.toBeInTheDocument();
  });
});
