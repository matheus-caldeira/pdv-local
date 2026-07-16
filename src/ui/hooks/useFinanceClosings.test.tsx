import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFinanceClosings } from './useFinanceClosings';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { ClosingPreview } from '../../application/finance/closing.usecases';
import type { MonthClosing } from '../../domain/finance/finance.entity';

const loadFinanceClosingPreview = vi.fn();
const listFinanceClosings = vi.fn();
const closeFinanceMonth = vi.fn();
const reopenFinanceMonth = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadFinanceClosingPreview: (month: string) =>
      loadFinanceClosingPreview(month),
    listFinanceClosings: () => listFinanceClosings(),
    closeFinanceMonth: (month: string, nowMs: number) =>
      closeFinanceMonth(month, nowMs),
    reopenFinanceMonth: (month: string) => reopenFinanceMonth(month),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const PREVIEW: ClosingPreview = {
  month: '2026-06',
  summary: {
    plannedIncome: 5000,
    plannedExpense: 3200,
    plannedBalance: 1800,
    actualIncome: 4800,
    actualExpense: 3000,
    actualBalance: 1800,
    categories: [],
  },
  pendingEntries: [],
  alreadyClosed: false,
};

const CLOSING: MonthClosing = {
  id: 1,
  uid: 'closing-1',
  month: '2026-05',
  closedAt: 1780000000000,
  plannedIncome: 4000,
  plannedExpense: 2500,
  plannedBalance: 1500,
  actualIncome: 4100,
  actualExpense: 2400,
  actualBalance: 1700,
  categories: [],
};

function Probe() {
  const { preview, closings, loading, closeMonth, reopenMonth } =
    useFinanceClosings('2026-06');
  return (
    <div>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <span>preview:{preview ? preview.month : 'none'}</span>
      <span>closings:{closings.length}</span>
      <button onClick={() => closeMonth()}>close</button>
      <button onClick={() => reopenMonth('2026-05')}>reopen</button>
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

describe('useFinanceClosings', () => {
  beforeEach(() => {
    loadFinanceClosingPreview.mockReset();
    listFinanceClosings.mockReset();
    closeFinanceMonth.mockReset();
    reopenFinanceMonth.mockReset();
    loadFinanceClosingPreview.mockResolvedValue(right(PREVIEW));
    listFinanceClosings.mockResolvedValue(right([CLOSING]));
  });
  afterEach(cleanup);

  it('loads the preview and the closings on mount', async () => {
    renderProbe();
    expect(screen.getByText('loading:yes')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(loadFinanceClosingPreview).toHaveBeenCalledWith('2026-06');
    expect(screen.getByText('preview:2026-06')).toBeInTheDocument();
    expect(screen.getByText('closings:1')).toBeInTheDocument();
  });

  it('toasts and clears the preview when loading the preview fails', async () => {
    loadFinanceClosingPreview.mockResolvedValue(
      left(new FakeError('falha resumo')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha resumo'),
    );
    expect(screen.getByText('preview:none')).toBeInTheDocument();
    expect(screen.getByText('closings:1')).toBeInTheDocument();
  });

  it('toasts when listing the closings fails', async () => {
    listFinanceClosings.mockResolvedValue(left(new FakeError('falha lista')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha lista'),
    );
    expect(screen.getByText('preview:2026-06')).toBeInTheDocument();
    expect(screen.getByText('closings:0')).toBeInTheDocument();
  });

  it('closes the month and reloads', async () => {
    closeFinanceMonth.mockResolvedValue(right(CLOSING));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('close'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Mês fechado!'),
    );
    expect(closeFinanceMonth).toHaveBeenCalledWith(
      '2026-06',
      expect.any(Number),
    );
    expect(loadFinanceClosingPreview).toHaveBeenCalledTimes(2);
  });

  it('toasts when closing the month fails', async () => {
    closeFinanceMonth.mockResolvedValue(left(new FakeError('mês futuro')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('close'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês futuro'),
    );
    expect(loadFinanceClosingPreview).toHaveBeenCalledTimes(1);
  });

  it('reopens a month and reloads', async () => {
    reopenFinanceMonth.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('reopen'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Mês reaberto!'),
    );
    expect(reopenFinanceMonth).toHaveBeenCalledWith('2026-05');
    expect(loadFinanceClosingPreview).toHaveBeenCalledTimes(2);
  });

  it('toasts when reopening a month fails', async () => {
    reopenFinanceMonth.mockResolvedValue(
      left(new FakeError('mês não fechado')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('reopen'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês não fechado'),
    );
    expect(loadFinanceClosingPreview).toHaveBeenCalledTimes(1);
  });
});
