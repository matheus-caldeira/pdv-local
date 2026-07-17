import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FinanceDashboardPage } from './FinanceDashboardPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import type { FinanceDashboard } from '../../../application/finance/dashboard.usecases';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

const loadFinanceDashboard = vi.fn();
const setFinanceEntryStatus = vi.fn();

vi.mock('../../../app/container', () => ({
  container: {
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

function entry(overrides: Partial<FinanceEntry>): FinanceEntry {
  return {
    uid: 'entry-1',
    description: 'Aluguel',
    amount: 1500,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: ['member-1'],
    date: Date.UTC(2026, 6, 5, 12),
    month: '2026-07',
    status: 'pending',
    source: 'manual',
    sourceUid: null,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
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
  overdueExpenseTotal: 0,
  overdueIncomeTotal: 0,
  pendingThisMonth: [],
  memberInvolvement: [],
};

const FULL_DASHBOARD: FinanceDashboard = {
  currentBalance: 2500.75,
  summary: {
    plannedIncome: 5000,
    plannedExpense: 3000,
    plannedBalance: 2000,
    actualIncome: 4500,
    actualExpense: 2800,
    actualBalance: 1700,
    categories: [
      {
        categoryUid: 'cat-1',
        name: 'Mercado',
        kind: 'expense',
        budgeted: 800,
        actual: 950,
      },
    ],
  },
  overdueEntries: [
    entry({
      uid: 'overdue-1',
      description: 'Luz atrasada',
      amount: 200,
      month: '2026-06',
    }),
  ],
  overdueExpenseTotal: 200,
  overdueIncomeTotal: 0,
  pendingThisMonth: [
    entry({ uid: 'pending-1', description: 'Internet', amount: 120 }),
    entry({
      uid: 'pending-2',
      description: 'Freela',
      amount: 900,
      kind: 'income',
    }),
  ],
  memberInvolvement: [
    { memberUid: 'member-1', name: 'Eu', total: 950, percent: 100 },
  ],
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/finance?month=2026-07']}>
        <Routes>
          <Route path="/finance" element={<FinanceDashboardPage />} />
          <Route path="/finance/entries" element={<div>entries page</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('FinanceDashboardPage', () => {
  beforeEach(() => {
    loadFinanceDashboard.mockReset();
    setFinanceEntryStatus.mockReset();
    loadFinanceDashboard.mockResolvedValue(right(FULL_DASHBOARD));
  });
  afterEach(cleanup);

  it('shows the loading state while fetching', async () => {
    loadFinanceDashboard.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => expect(loadFinanceDashboard).toHaveBeenCalled());
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('loads the dashboard for the month in the URL', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    expect(loadFinanceDashboard).toHaveBeenCalledWith(
      '2026-07',
      expect.any(Number),
    );
  });

  it('shows a failure message and toasts when loading fails', async () => {
    loadFinanceDashboard.mockResolvedValue(left(new FakeError('falha geral')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha geral'),
    );
    expect(
      screen.getByText('Não foi possível carregar os dados financeiros.'),
    ).toBeInTheDocument();
  });

  it('invites to create the first entry when everything is empty', async () => {
    loadFinanceDashboard.mockResolvedValue(right(EMPTY_DASHBOARD));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Comece pelo primeiro lançamento'),
      ).toBeInTheDocument(),
    );
    const link = screen.getByRole('link', {
      name: 'Criar primeiro lançamento',
    });
    expect(link).toHaveAttribute('href', '/finance/entries');
    await userEvent.click(link);
    expect(screen.getByText('entries page')).toBeInTheDocument();
  });

  it('renders summary cards, overdue card, pending list, progress and members', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    expect(screen.getByText('Saldo atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 2500,75')).toBeInTheDocument();
    const overdue = screen.getByRole('region', { name: 'Contas atrasadas' });
    expect(within(overdue).getByText('Luz atrasada')).toBeInTheDocument();
    const pending = screen.getByRole('region', {
      name: 'Contas a pagar do mês',
    });
    expect(within(pending).getByText('Internet')).toBeInTheDocument();
    expect(within(pending).getByText('Freela')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Mercado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Envolvimento por membro' }),
    ).toBeInTheDocument();
    expect(within(pending).getByText('R$ 900,00')).toHaveClass('text-success');
    expect(within(pending).getByText('R$ 120,00')).toHaveClass('text-danger');
  });

  it('shows the receivable line and colors overdue amounts by kind', async () => {
    loadFinanceDashboard.mockResolvedValue(
      right({
        ...FULL_DASHBOARD,
        overdueEntries: [
          entry({
            uid: 'overdue-1',
            description: 'Luz atrasada',
            amount: 200,
            month: '2026-06',
          }),
          entry({
            uid: 'overdue-2',
            description: 'Freela atrasado',
            amount: 900,
            kind: 'income',
            month: '2026-06',
          }),
        ],
        overdueExpenseTotal: 200,
        overdueIncomeTotal: 900,
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    const overdue = screen.getByRole('region', { name: 'Contas atrasadas' });
    expect(within(overdue).getByText('A receber')).toBeInTheDocument();
    for (const amount of within(overdue).getAllByText('R$ 900,00')) {
      expect(amount).toHaveClass('text-success');
    }
    for (const amount of within(overdue).getAllByText('R$ 200,00')) {
      expect(amount).toHaveClass('text-danger');
    }
  });

  it('hides the overdue card when there are no overdue entries', async () => {
    loadFinanceDashboard.mockResolvedValue(
      right({
        ...FULL_DASHBOARD,
        overdueEntries: [],
        overdueExpenseTotal: 0,
        overdueIncomeTotal: 0,
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('region', { name: 'Contas atrasadas' }),
    ).not.toBeInTheDocument();
  });

  it('shows a friendly message when there is nothing pending this month', async () => {
    loadFinanceDashboard.mockResolvedValue(
      right({ ...FULL_DASHBOARD, pendingThisMonth: [] }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Nenhuma conta pendente neste mês'),
    ).toBeInTheDocument();
  });

  it('marks an overdue entry as paid and reloads', async () => {
    setFinanceEntryStatus.mockResolvedValue(right(entry({ uid: 'overdue-1' })));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar Luz atrasada como pago' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Lançamento marcado como pago',
      ),
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('overdue-1', 'paid');
    expect(loadFinanceDashboard).toHaveBeenCalledTimes(2);
  });

  it('marks a pending entry of the month as paid', async () => {
    setFinanceEntryStatus.mockResolvedValue(right(entry({ uid: 'pending-1' })));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar Internet como pago' }),
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('pending-1', 'paid');
  });

  it('toasts when marking as paid fails', async () => {
    setFinanceEntryStatus.mockResolvedValue(
      left(new FakeError('não encontrado')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Início financeiro')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar Internet como pago' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('não encontrado'),
    );
    expect(loadFinanceDashboard).toHaveBeenCalledTimes(1);
  });
});
