import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFinanceBudget } from './useFinanceBudget';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { BudgetLineView } from '../../application/finance/budget.usecases';
import type { MonthClosing } from '../../domain/finance/finance.entity';

const loadFinanceBudget = vi.fn();
const listFinanceClosings = vi.fn();
const saveFinanceBudgetTemplateItem = vi.fn();
const saveFinanceBudgetOverride = vi.fn();
const removeFinanceBudgetItem = vi.fn();

vi.mock('../../app/container', () => ({
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

const LINE: BudgetLineView = {
  categoryUid: 'cat-1',
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

function Probe({ month }: { month: string }) {
  const {
    lines,
    isClosed,
    loading,
    saveTemplate,
    saveOverride,
    removeOverride,
  } = useFinanceBudget(month);
  return (
    <div>
      <span>loading:{loading ? 'yes' : 'no'}</span>
      <span>closed:{isClosed ? 'yes' : 'no'}</span>
      <span>lines:{lines.length}</span>
      <button onClick={() => saveTemplate('cat-1', 120)}>template</button>
      <button onClick={() => saveOverride('cat-1', 90)}>override</button>
      <button onClick={() => removeOverride('cat-1', 80)}>remove</button>
    </div>
  );
}

function renderProbe(month = '2026-07') {
  return render(
    <ToastProvider>
      <Probe month={month} />
    </ToastProvider>,
  );
}

describe('useFinanceBudget', () => {
  beforeEach(() => {
    loadFinanceBudget.mockReset();
    listFinanceClosings.mockReset();
    saveFinanceBudgetTemplateItem.mockReset();
    saveFinanceBudgetOverride.mockReset();
    removeFinanceBudgetItem.mockReset();
    loadFinanceBudget.mockResolvedValue(right([LINE]));
    listFinanceClosings.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads the budget lines for the month', async () => {
    renderProbe();
    expect(screen.getByText('loading:yes')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(screen.getByText('lines:1')).toBeInTheDocument();
    expect(screen.getByText('closed:no')).toBeInTheDocument();
    expect(loadFinanceBudget).toHaveBeenCalledWith('2026-07');
  });

  it('flags the month as closed when there is a closing for it', async () => {
    listFinanceClosings.mockResolvedValue(right([CLOSING]));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('closed:yes')).toBeInTheDocument(),
    );
  });

  it('keeps the month open when closings belong to other months', async () => {
    listFinanceClosings.mockResolvedValue(
      right([{ ...CLOSING, month: '2026-06' }]),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(screen.getByText('closed:no')).toBeInTheDocument();
  });

  it('toasts when loading the budget fails', async () => {
    loadFinanceBudget.mockResolvedValue(left(new FakeError('falha orçamento')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha orçamento'),
    );
    expect(screen.getByText('lines:0')).toBeInTheDocument();
  });

  it('toasts when loading the closings fails', async () => {
    listFinanceClosings.mockResolvedValue(
      left(new FakeError('falha fechamentos')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha fechamentos'),
    );
    expect(screen.getByText('closed:no')).toBeInTheDocument();
  });

  it('saves a template item and reloads', async () => {
    saveFinanceBudgetTemplateItem.mockResolvedValue(right({ uid: 'item-1' }));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('template'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Modelo de orçamento atualizado',
      ),
    );
    expect(saveFinanceBudgetTemplateItem).toHaveBeenCalledWith('cat-1', 120);
    expect(loadFinanceBudget).toHaveBeenCalledTimes(2);
  });

  it('toasts when saving a template item fails', async () => {
    saveFinanceBudgetTemplateItem.mockResolvedValue(
      left(new FakeError('valor inválido')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('template'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('valor inválido'),
    );
    expect(loadFinanceBudget).toHaveBeenCalledTimes(1);
  });

  it('saves a month override and reloads', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(right({ uid: 'item-2' }));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('override'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Orçamento do mês atualizado',
      ),
    );
    expect(saveFinanceBudgetOverride).toHaveBeenCalledWith(
      'cat-1',
      '2026-07',
      90,
    );
    expect(loadFinanceBudget).toHaveBeenCalledTimes(2);
  });

  it('toasts when saving a month override fails', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(
      left(new FakeError('mês fechado')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('override'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês fechado'),
    );
    expect(loadFinanceBudget).toHaveBeenCalledTimes(1);
  });

  it('removes an override by resolving its uid and reloads', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(right({ uid: 'item-9' }));
    removeFinanceBudgetItem.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Ajuste removido, valor do modelo restaurado',
      ),
    );
    expect(saveFinanceBudgetOverride).toHaveBeenCalledWith(
      'cat-1',
      '2026-07',
      80,
    );
    expect(removeFinanceBudgetItem).toHaveBeenCalledWith('item-9');
    expect(loadFinanceBudget).toHaveBeenCalledTimes(2);
  });

  it('toasts and skips removal when resolving the override fails', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(
      left(new FakeError('mês fechado')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês fechado'),
    );
    expect(removeFinanceBudgetItem).not.toHaveBeenCalled();
    expect(loadFinanceBudget).toHaveBeenCalledTimes(1);
  });

  it('toasts when removing the override item fails', async () => {
    saveFinanceBudgetOverride.mockResolvedValue(right({ uid: 'item-9' }));
    removeFinanceBudgetItem.mockResolvedValue(
      left(new FakeError('falha remover')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha remover'),
    );
    expect(loadFinanceBudget).toHaveBeenCalledTimes(1);
  });

  it('reloads when the month changes', async () => {
    const { rerender } = renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    rerender(
      <ToastProvider>
        <Probe month="2026-08" />
      </ToastProvider>,
    );
    await waitFor(() =>
      expect(loadFinanceBudget).toHaveBeenCalledWith('2026-08'),
    );
  });
});
