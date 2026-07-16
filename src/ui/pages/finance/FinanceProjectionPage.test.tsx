import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceProjectionPage } from './FinanceProjectionPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import type { ProjectionPoint } from '../../../domain/finance/finance.rules';

const loadFinanceProjection = vi.fn();

vi.mock('../../../app/container', () => ({
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
  {
    month: '2026-08',
    plannedIncome: 1000,
    plannedExpense: 2600,
    delta: -1600,
    balance: -600,
  },
];

const EMPTY_POINTS: ProjectionPoint[] = [
  {
    month: '2026-07',
    plannedIncome: 0,
    plannedExpense: 0,
    delta: 0,
    balance: 0,
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <FinanceProjectionPage />
    </ToastProvider>,
  );
}

describe('FinanceProjectionPage', () => {
  beforeEach(() => {
    loadFinanceProjection.mockReset();
    loadFinanceProjection.mockResolvedValue(right(POINTS));
  });
  afterEach(cleanup);

  it('shows the loading state while the projection loads', async () => {
    let resolve: (value: unknown) => void = () => {};
    loadFinanceProjection.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderPage();
    expect(screen.getByText('Carregando projeção…')).toBeInTheDocument();
    resolve(right(POINTS));
    await waitFor(() =>
      expect(
        screen.queryByText('Carregando projeção…'),
      ).not.toBeInTheDocument(),
    );
  });

  it('renders the chart, note and table on success', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('img', { name: /Gráfico do saldo projetado por mês/ }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Entradas previstas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Saídas previstas' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Variação' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Saldo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', { name: 'julho de 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('rowheader', { name: 'agosto de 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('projetado')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Recorrências ainda não lançadas entram na projeção como valores projetados.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Saldo positivo')).toBeInTheDocument();
    expect(screen.getByText('Saldo negativo')).toBeInTheDocument();
  });

  it('shows the final projected balance with the danger token when negative', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Saldo projetado ao fim do período'),
      ).toBeInTheDocument(),
    );
    const negatives = screen.getAllByText('R$ -600,00');
    expect(negatives.length).toBeGreaterThan(0);
    negatives.forEach((element) => expect(element).toHaveClass('text-danger'));
  });

  it('shows the final projected balance without the danger token when positive', async () => {
    loadFinanceProjection.mockResolvedValue(right([POINTS[0]]));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Saldo projetado ao fim do período'),
      ).toBeInTheDocument(),
    );
    const balances = screen.getAllByText('R$ 1000,00');
    balances.forEach((element) =>
      expect(element).not.toHaveClass('text-danger'),
    );
  });

  it('selects six months and the both source by default', async () => {
    renderPage();
    await waitFor(() => expect(loadFinanceProjection).toHaveBeenCalled());
    expect(screen.getByRole('radio', { name: '6 meses' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '3 meses' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Ambos/ })).toBeChecked();
    expect(
      screen.getByRole('radio', { name: /^Lançamentos previstos/ }),
    ).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /^Orçamento/ })).not.toBeChecked();
  });

  it('reloads the projection when the period changes', async () => {
    renderPage();
    await waitFor(() => expect(loadFinanceProjection).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('radio', { name: '3 meses' }));
    await waitFor(() =>
      expect(loadFinanceProjection).toHaveBeenLastCalledWith({
        months: 3,
        source: 'both',
        nowMs: expect.any(Number),
      }),
    );
    expect(screen.getByRole('radio', { name: '3 meses' })).toBeChecked();
  });

  it('reloads the projection when the source changes', async () => {
    renderPage();
    await waitFor(() => expect(loadFinanceProjection).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('radio', { name: /^Orçamento/ }));
    await waitFor(() =>
      expect(loadFinanceProjection).toHaveBeenLastCalledWith({
        months: 6,
        source: 'budget',
        nowMs: expect.any(Number),
      }),
    );
    expect(screen.getByRole('radio', { name: /^Orçamento/ })).toBeChecked();
  });

  it('shows the error state and retries', async () => {
    loadFinanceProjection.mockResolvedValueOnce(
      left(new FakeError('falha na projeção')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('falha na projeção'),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    );
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invites the user to register data when there are no points', async () => {
    loadFinanceProjection.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Sem dados suficientes')).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        'Cadastre um orçamento ou lançamentos previstos para ver a projeção do seu saldo.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('treats all-zero points as insufficient data', async () => {
    loadFinanceProjection.mockResolvedValue(right(EMPTY_POINTS));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Sem dados suficientes')).toBeInTheDocument(),
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
