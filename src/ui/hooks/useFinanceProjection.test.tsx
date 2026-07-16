import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFinanceProjection } from './useFinanceProjection';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { ProjectionPoint } from '../../domain/finance/finance.rules';

const loadFinanceProjection = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadFinanceProjection: (input: unknown) => loadFinanceProjection(input),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const POINTS: ProjectionPoint[] = [
  {
    month: '2026-07',
    plannedIncome: 3000,
    plannedExpense: 2000,
    delta: 1000,
    balance: 1000,
  },
];

function Probe() {
  const {
    points,
    months,
    setMonths,
    source,
    setSource,
    loading,
    error,
    reload,
  } = useFinanceProjection();
  return (
    <div>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <span>error:{error ?? 'none'}</span>
      <span>count:{points.length}</span>
      <span>months:{months}</span>
      <span>source:{source}</span>
      <button onClick={() => setMonths(12)}>twelve</button>
      <button onClick={() => setSource('entries')}>entries</button>
      <button onClick={() => reload()}>reload</button>
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

describe('useFinanceProjection', () => {
  beforeEach(() => {
    loadFinanceProjection.mockReset();
    loadFinanceProjection.mockResolvedValue(right(POINTS));
  });
  afterEach(cleanup);

  it('loads on mount with six months from the both source', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(loadFinanceProjection).toHaveBeenCalledWith({
      months: 6,
      source: 'both',
      nowMs: expect.any(Number),
    });
    expect(screen.getByText('count:1')).toBeInTheDocument();
    expect(screen.getByText('error:none')).toBeInTheDocument();
  });

  it('starts in the loading state', async () => {
    renderProbe();
    expect(screen.getByText('loading:yes')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
  });

  it('sets the error, clears points and toasts when loading fails', async () => {
    loadFinanceProjection.mockResolvedValue(
      left(new FakeError('falha na projeção')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('error:falha na projeção')).toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('falha na projeção');
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('reloads with twelve months when the month count changes', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('twelve'));
    await waitFor(() =>
      expect(loadFinanceProjection).toHaveBeenLastCalledWith({
        months: 12,
        source: 'both',
        nowMs: expect.any(Number),
      }),
    );
    expect(screen.getByText('months:12')).toBeInTheDocument();
  });

  it('reloads from the entries source when the source changes', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('entries'));
    await waitFor(() =>
      expect(loadFinanceProjection).toHaveBeenLastCalledWith({
        months: 6,
        source: 'entries',
        nowMs: expect.any(Number),
      }),
    );
    expect(screen.getByText('source:entries')).toBeInTheDocument();
  });

  it('clears a previous error after a successful reload', async () => {
    loadFinanceProjection.mockResolvedValueOnce(
      left(new FakeError('falha na projeção')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('error:falha na projeção')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('reload'));
    await waitFor(() =>
      expect(screen.getByText('error:none')).toBeInTheDocument(),
    );
    expect(loadFinanceProjection).toHaveBeenCalledTimes(2);
    expect(screen.getByText('count:1')).toBeInTheDocument();
  });
});
