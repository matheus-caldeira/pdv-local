import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FinanceClosingsPage } from './FinanceClosingsPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import {
  addMonths,
  currentMonthKey,
} from '../../../domain/finance/finance.rules';
import type { ClosingPreview } from '../../../application/finance/closing.usecases';
import type { MonthClosing } from '../../../domain/finance/finance.entity';

const loadFinanceClosingPreview = vi.fn();
const listFinanceClosings = vi.fn();
const closeFinanceMonth = vi.fn();
const reopenFinanceMonth = vi.fn();

vi.mock('../../../app/container', () => ({
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

function makePreview(overrides: Partial<ClosingPreview> = {}): ClosingPreview {
  return {
    month: '2026-06',
    summary: {
      plannedIncome: 5000,
      plannedExpense: 3200,
      plannedBalance: 1800,
      actualIncome: 4800,
      actualExpense: 3000,
      actualBalance: 1750,
      categories: [
        {
          categoryUid: 'cat-1',
          name: 'Salário',
          kind: 'income',
          budgeted: 2600,
          actual: 2500,
        },
      ],
    },
    pendingEntries: [
      {
        id: 1,
        uid: 'entry-1',
        description: 'Conta de luz',
        amount: 180,
        kind: 'expense',
        categoryUid: 'cat-2',
        memberUids: [],
        date: 1780000000000,
        month: '2026-06',
        status: 'pending',
        source: 'manual',
        sourceUid: null,
        installmentNumber: null,
        sourceEntryUids: [],
        formulaBaseMonth: null,
        createdAt: 1780000000000,
        updatedAt: 1780000000000,
      },
    ],
    alreadyClosed: false,
    ...overrides,
  };
}

const MAY_CLOSING: MonthClosing = {
  id: 1,
  uid: 'closing-may',
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

const JUNE_CLOSING: MonthClosing = {
  id: 2,
  uid: 'closing-june',
  month: '2026-06',
  closedAt: 1781000000000,
  plannedIncome: 5000,
  plannedExpense: 3200,
  plannedBalance: 1800,
  actualIncome: 4900,
  actualExpense: 3100,
  actualBalance: 1800,
  categories: [],
};

function renderPage(month = '2026-06') {
  return render(
    <MemoryRouter initialEntries={[`/finance/closings?month=${month}`]}>
      <ToastProvider>
        <FinanceClosingsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('FinanceClosingsPage', () => {
  beforeEach(() => {
    loadFinanceClosingPreview.mockReset();
    listFinanceClosings.mockReset();
    closeFinanceMonth.mockReset();
    reopenFinanceMonth.mockReset();
    loadFinanceClosingPreview.mockResolvedValue(right(makePreview()));
    listFinanceClosings.mockResolvedValue(right([MAY_CLOSING]));
  });
  afterEach(cleanup);

  it('shows the loading state while fetching', () => {
    loadFinanceClosingPreview.mockReturnValue(new Promise(() => {}));
    listFinanceClosings.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders the preview, the pending warning and the history', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Fechar junho de 2026' }),
      ).toBeInTheDocument(),
    );
    expect(loadFinanceClosingPreview).toHaveBeenCalledWith('2026-06');
    expect(screen.getByRole('alert')).toHaveTextContent('Conta de luz');
    const history = screen.getByRole('list', {
      name: 'Histórico de fechamentos',
    });
    expect(within(history).getByText('maio de 2026')).toBeInTheDocument();
  });

  it('shows the empty history message when there are no closings', async () => {
    listFinanceClosings.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum mês fechado ainda.')).toBeInTheDocument(),
    );
  });

  it('shows a fallback message when loading the preview fails', async () => {
    loadFinanceClosingPreview.mockResolvedValue(
      left(new FakeError('falha resumo')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha resumo'),
    );
    expect(
      screen.getByText('Não foi possível carregar o resumo do mês.'),
    ).toBeInTheDocument();
  });

  it('closes the month after confirming in the modal', async () => {
    closeFinanceMonth.mockResolvedValue(right(JUNE_CLOSING));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fechar mês' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar mês' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/O resumo do mês será salvo/),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar fechamento' }),
    );
    expect(closeFinanceMonth).toHaveBeenCalledWith(
      '2026-06',
      expect.any(Number),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the closing modal open when closing fails', async () => {
    closeFinanceMonth.mockResolvedValue(left(new FakeError('falha fechar')));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fechar mês' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar mês' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar fechamento' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha fechar'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the closing modal via the backdrop without closing the month', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fechar mês' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar mês' }));
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(closeFinanceMonth).not.toHaveBeenCalled();
  });

  it('disables closing for future months with an explanation', async () => {
    const futureMonth = addMonths(currentMonthKey(Date.now()), 1);
    loadFinanceClosingPreview.mockResolvedValue(
      right(makePreview({ month: futureMonth, pendingEntries: [] })),
    );
    renderPage(futureMonth);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fechar mês' }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Fechar mês' })).toBeDisabled();
    expect(
      screen.getByText(/Não é possível fechar um mês futuro/),
    ).toBeInTheDocument();
  });

  it('shows the frozen snapshot and reopens a closed month', async () => {
    loadFinanceClosingPreview.mockResolvedValue(
      right(makePreview({ alreadyClosed: true })),
    );
    listFinanceClosings.mockResolvedValue(right([JUNE_CLOSING, MAY_CLOSING]));
    reopenFinanceMonth.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'junho de 2026 está fechado' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir mês' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/O resumo salvo de junho de 2026 será/),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar reabertura' }),
    );
    expect(reopenFinanceMonth).toHaveBeenCalledWith('2026-06');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('reopens a month from the history list', async () => {
    reopenFinanceMonth.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reabrir' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/O resumo salvo de maio de 2026 será/),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Confirmar reabertura' }),
    );
    expect(reopenFinanceMonth).toHaveBeenCalledWith('2026-05');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the reopen modal open when reopening fails', async () => {
    reopenFinanceMonth.mockResolvedValue(left(new FakeError('falha reabrir')));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reabrir' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar reabertura' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha reabrir'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the reopen modal via the backdrop without reopening', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Reabrir' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(reopenFinanceMonth).not.toHaveBeenCalled();
  });
});
