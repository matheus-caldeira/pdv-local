import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCash } from './useCash';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { CashSummary } from '../../application/cash/cash.usecases';

const loadCashSummary = vi.fn();
const openSession = vi.fn();
const closeSession = vi.fn();
const addCashMovement = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadCashSummary: () => loadCashSummary(),
    openSession: (cashInitial: number) => openSession(cashInitial),
    closeSession: (cashFinal: number, notes: string) =>
      closeSession(cashFinal, notes),
    addCashMovement: (input: unknown) => addCashMovement(input),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const EMPTY_SUMMARY: CashSummary = {
  session: null,
  movements: [],
  salesByMethod: {},
  cashSales: 0,
  expectedCash: 0,
  pastSessions: [],
};

function Probe() {
  const { summary, openSession, closeSession, addMovement } = useCash();
  return (
    <div>
      <span>has:{summary ? 'yes' : 'no'}</span>
      <button onClick={() => openSession(100)}>open</button>
      <button onClick={() => closeSession(200, 'obs')}>close</button>
      <button
        onClick={() =>
          addMovement({ type: 'sangria', amount: 5, reason: 'troco' })
        }
      >
        sangria
      </button>
      <button
        onClick={() =>
          addMovement({ type: 'suprimento', amount: 9, reason: 'caixa' })
        }
      >
        suprimento
      </button>
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

describe('useCash', () => {
  beforeEach(() => {
    loadCashSummary.mockReset();
    openSession.mockReset();
    closeSession.mockReset();
    addCashMovement.mockReset();
    loadCashSummary.mockResolvedValue(right(EMPTY_SUMMARY));
  });
  afterEach(cleanup);

  it('loads the summary on mount', async () => {
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    expect(screen.getByText('has:yes')).toBeInTheDocument();
  });

  it('toasts when loading fails', async () => {
    loadCashSummary.mockResolvedValue(left(new FakeError('falha resumo')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha resumo'),
    );
    expect(screen.getByText('has:no')).toBeInTheDocument();
  });

  it('opens a session and refreshes', async () => {
    openSession.mockResolvedValue(right({ id: 1 }));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('open'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Caixa aberto!'),
    );
    expect(openSession).toHaveBeenCalledWith(100);
    expect(loadCashSummary).toHaveBeenCalledTimes(2);
  });

  it('toasts when opening fails', async () => {
    openSession.mockResolvedValue(left(new FakeError('ja aberto')));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('open'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('ja aberto'),
    );
    expect(loadCashSummary).toHaveBeenCalledTimes(1);
  });

  it('closes a session and refreshes', async () => {
    closeSession.mockResolvedValue(right({ id: 1 }));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('close'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Caixa fechado!'),
    );
    expect(closeSession).toHaveBeenCalledWith(200, 'obs');
    expect(loadCashSummary).toHaveBeenCalledTimes(2);
  });

  it('toasts when closing fails', async () => {
    closeSession.mockResolvedValue(left(new FakeError('sem caixa')));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('close'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('sem caixa'),
    );
    expect(loadCashSummary).toHaveBeenCalledTimes(1);
  });

  it('adds a sangria movement and refreshes', async () => {
    addCashMovement.mockResolvedValue(right({ id: 1 }));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('sangria'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Sangria registrada',
      ),
    );
    expect(addCashMovement).toHaveBeenCalledWith({
      type: 'sangria',
      amount: 5,
      reason: 'troco',
    });
    expect(loadCashSummary).toHaveBeenCalledTimes(2);
  });

  it('adds a suprimento movement', async () => {
    addCashMovement.mockResolvedValue(right({ id: 2 }));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('suprimento'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Suprimento registrado',
      ),
    );
    expect(addCashMovement).toHaveBeenCalledWith({
      type: 'suprimento',
      amount: 9,
      reason: 'caixa',
    });
  });

  it('toasts when adding a movement fails', async () => {
    addCashMovement.mockResolvedValue(left(new FakeError('valor invalido')));
    renderProbe();
    await waitFor(() => expect(loadCashSummary).toHaveBeenCalled());
    await userEvent.click(screen.getByText('sangria'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('valor invalido'),
    );
    expect(loadCashSummary).toHaveBeenCalledTimes(1);
  });
});
