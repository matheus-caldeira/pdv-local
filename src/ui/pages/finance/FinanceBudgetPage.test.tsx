import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FinanceBudgetPage } from './FinanceBudgetPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import type { BudgetLineView } from '../../../application/finance/budget.usecases';
import type { MonthClosing } from '../../../domain/finance/finance.entity';

const loadFinanceBudget = vi.fn();
const listFinanceClosings = vi.fn();
const saveFinanceBudgetTemplateItem = vi.fn();
const saveFinanceBudgetOverride = vi.fn();
const removeFinanceBudgetItem = vi.fn();

vi.mock('../../../app/container', () => ({
  container: {
    loadFinanceBudget: (month: string) => loadFinanceBudget(month),
    listFinanceClosings: () => listFinanceClosings(),
    saveFinanceBudgetTemplateItem: (categoryUid: string, amount: number) =>
      saveFinanceBudgetTemplateItem(categoryUid, amount),
    saveFinanceBudgetOverride: (
      categoryUid: string,
      month: string,
      amount: number,
    ) => saveFinanceBudgetOverride(categoryUid, month, amount),
    removeFinanceBudgetItem: (uid: string) => removeFinanceBudgetItem(uid),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const INCOME_LINE: BudgetLineView = {
  categoryUid: 'inc-1',
  name: 'Salário',
  kind: 'income',
  amount: 5000,
  fromOverride: false,
  templateAmount: 5000,
  overrideAmount: null,
  actual: 5200,
};

const OVERRIDE_LINE: BudgetLineView = {
  categoryUid: 'exp-1',
  name: 'Mercado',
  kind: 'expense',
  amount: 80,
  fromOverride: true,
  templateAmount: 100,
  overrideAmount: 80,
  actual: 50,
};

const CLOSING: MonthClosing = {
  id: 1,
  uid: 'closing-1',
  month: '2026-07',
  closedAt: 1700000000000,
  plannedIncome: 0,
  plannedExpense: 0,
  plannedBalance: 0,
  actualIncome: 0,
  actualExpense: 0,
  actualBalance: 0,
  categories: [],
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/finance/budget?month=2026-07']}>
        <Routes>
          <Route path="/finance/budget" element={<FinanceBudgetPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('FinanceBudgetPage', () => {
  beforeEach(() => {
    loadFinanceBudget.mockReset();
    listFinanceClosings.mockReset();
    saveFinanceBudgetTemplateItem.mockReset();
    saveFinanceBudgetOverride.mockReset();
    removeFinanceBudgetItem.mockReset();
    loadFinanceBudget.mockResolvedValue(right([INCOME_LINE, OVERRIDE_LINE]));
    listFinanceClosings.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('shows the loading state while the budget loads', () => {
    loadFinanceBudget.mockReturnValue(new Promise(() => {}));
    listFinanceClosings.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando orçamento…')).toBeInTheDocument();
  });

  it('shows the empty state when there are no categories', async () => {
    loadFinanceBudget.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText(/Nenhuma categoria cadastrada/),
      ).toBeInTheDocument(),
    );
  });

  it('toasts when loading fails', async () => {
    loadFinanceBudget.mockResolvedValue(left(new FakeError('falha orçamento')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha orçamento'),
    );
  });

  it('renders the budget grouped by kind with the month from the URL', async () => {
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Entradas' }),
      ).toBeInTheDocument(),
    );
    expect(loadFinanceBudget).toHaveBeenCalledWith('2026-07');
    expect(screen.getByRole('heading', { name: 'Saídas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Modelo de Mercado')).toHaveValue(100);
    expect(screen.getByLabelText('Valor de Mercado no mês')).toHaveValue(80);
    expect(screen.getByText('Ajustado')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('saves the template amount when editing the model column', async () => {
    saveFinanceBudgetTemplateItem.mockResolvedValue(right({ uid: 'item-1' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText('Modelo de Mercado')).toBeInTheDocument(),
    );
    const input = screen.getByLabelText('Modelo de Mercado');
    await userEvent.clear(input);
    await userEvent.type(input, '150{enter}');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Modelo de orçamento atualizado',
      ),
    );
    expect(saveFinanceBudgetTemplateItem).toHaveBeenCalledWith('exp-1', 150);
    expect(loadFinanceBudget).toHaveBeenCalledTimes(2);
  });

  it('saves a month override when editing the month column', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(right({ uid: 'item-2' }));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Valor de Mercado no mês'),
      ).toBeInTheDocument(),
    );
    const input = screen.getByLabelText('Valor de Mercado no mês');
    await userEvent.clear(input);
    await userEvent.type(input, '65');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Orçamento do mês atualizado',
      ),
    );
    expect(saveFinanceBudgetOverride).toHaveBeenCalledWith(
      'exp-1',
      '2026-07',
      65,
    );
  });

  it('toasts the error and keeps the value when saving fails', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(
      left(new FakeError('valor inválido')),
    );
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByLabelText('Valor de Mercado no mês'),
      ).toBeInTheDocument(),
    );
    const input = screen.getByLabelText('Valor de Mercado no mês');
    await userEvent.clear(input);
    await userEvent.type(input, '65');
    await userEvent.tab();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('valor inválido'),
    );
    expect(loadFinanceBudget).toHaveBeenCalledTimes(1);
  });

  it('removes the override returning the line to the template', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(right({ uid: 'item-9' }));
    removeFinanceBudgetItem.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Ajuste removido, valor do modelo restaurado',
      ),
    );
    expect(saveFinanceBudgetOverride).toHaveBeenCalledWith(
      'exp-1',
      '2026-07',
      80,
    );
    expect(removeFinanceBudgetItem).toHaveBeenCalledWith('item-9');
  });

  it('shows the closed-month banner and locks month editing', async () => {
    listFinanceClosings.mockResolvedValue(right([CLOSING]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('note')).toHaveTextContent('Mês fechado'),
    );
    expect(screen.getByLabelText('Valor de Mercado no mês')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Modelo de Mercado')).toBeEnabled();
  });
});
