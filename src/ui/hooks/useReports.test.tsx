import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReports } from './useReports';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';

const listReportSessions = vi.fn();
const loadSessionReport = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listReportSessions: () => listReportSessions(),
    loadSessionReport: (id: number) => loadSessionReport(id),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const SESSIONS: Session[] = [
  {
    id: 1,
    openedAt: 1000,
    closedAt: 2000,
    cashInitial: 0,
    cashFinal: 0,
    notes: '',
  },
  {
    id: 2,
    openedAt: 5000,
    closedAt: null,
    cashInitial: 0,
    cashFinal: null,
    notes: '',
  },
];

function makeReport(total: number): SessionReport {
  return {
    summary: {
      totalSales: total,
      totalCost: 0,
      profit: total,
      margin: 0,
      paidCount: 0,
    },
    byMethod: {},
    products: [],
    pending: [],
  };
}

function Probe() {
  const { sessions, selectedSessionId, select, report } = useReports();
  return (
    <div>
      <span>count:{sessions.length}</span>
      <span>selected:{selectedSessionId ?? 'none'}</span>
      <span>report:{report ? report.summary.totalSales : 'none'}</span>
      <button onClick={() => select(1)}>select-1</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useReports', () => {
  beforeEach(() => {
    listReportSessions.mockReset();
    loadSessionReport.mockReset();
    listReportSessions.mockResolvedValue(right(SESSIONS));
    loadSessionReport.mockResolvedValue(right(makeReport(50)));
  });
  afterEach(cleanup);

  it('loads sessions and selects the most recent by default', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('selected:2')).toBeInTheDocument(),
    );
    expect(screen.getByText('count:2')).toBeInTheDocument();
    expect(loadSessionReport).toHaveBeenCalledWith(2);
  });

  it('handles an empty session list with no selection', async () => {
    listReportSessions.mockResolvedValue(right([]));
    renderProbe();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    expect(screen.getByText('count:0')).toBeInTheDocument();
    expect(screen.getByText('selected:none')).toBeInTheDocument();
    expect(screen.getByText('report:none')).toBeInTheDocument();
    expect(loadSessionReport).not.toHaveBeenCalled();
  });

  it('ignores sessions without an id when defaulting', async () => {
    listReportSessions.mockResolvedValue(
      right([
        {
          openedAt: 9000,
          closedAt: null,
          cashInitial: 0,
          cashFinal: null,
          notes: '',
        },
      ]),
    );
    renderProbe();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    expect(screen.getByText('selected:none')).toBeInTheDocument();
  });

  it('loads the report when the selection changes', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('report:50')).toBeInTheDocument(),
    );
    loadSessionReport.mockResolvedValue(right(makeReport(99)));
    await userEvent.click(screen.getByText('select-1'));
    await waitFor(() =>
      expect(screen.getByText('selected:1')).toBeInTheDocument(),
    );
    expect(loadSessionReport).toHaveBeenLastCalledWith(1);
    await waitFor(() =>
      expect(screen.getByText('report:99')).toBeInTheDocument(),
    );
  });

  it('toasts when loading sessions fails', async () => {
    listReportSessions.mockResolvedValue(left(new FakeError('falha sessoes')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha sessoes'),
    );
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('toasts when loading a report fails', async () => {
    loadSessionReport.mockResolvedValue(left(new FakeError('falha relatorio')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha relatorio'),
    );
    expect(screen.getByText('report:none')).toBeInTheDocument();
  });

  it('ignores resolved sessions after unmount', async () => {
    let resolveSessions: (value: ReturnType<typeof right>) => void = () => {};
    listReportSessions.mockReturnValue(
      new Promise((resolve) => {
        resolveSessions = resolve;
      }),
    );
    const { unmount } = renderProbe();
    await waitFor(() => expect(listReportSessions).toHaveBeenCalled());
    unmount();
    resolveSessions(right(SESSIONS));
    await Promise.resolve();
    expect(screen.queryByText('count:2')).not.toBeInTheDocument();
  });

  it('ignores a resolved report after unmount', async () => {
    let resolveReport: (value: ReturnType<typeof right>) => void = () => {};
    loadSessionReport.mockReturnValue(
      new Promise((resolve) => {
        resolveReport = resolve;
      }),
    );
    const { unmount } = renderProbe();
    await waitFor(() => expect(loadSessionReport).toHaveBeenCalledWith(2));
    unmount();
    resolveReport(right(makeReport(77)));
    await Promise.resolve();
    expect(screen.queryByText('report:77')).not.toBeInTheDocument();
  });

  it('ignores the clear microtask after unmount with no selection', async () => {
    listReportSessions.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderProbe();
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByText('report:none')).not.toBeInTheDocument();
  });
});
