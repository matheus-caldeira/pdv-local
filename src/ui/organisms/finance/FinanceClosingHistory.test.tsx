import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceClosingHistory } from './FinanceClosingHistory';
import type { MonthClosing } from '../../../domain/finance/finance.entity';

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
  categories: [
    {
      categoryUid: 'cat-1',
      name: 'Salário',
      kind: 'income',
      budgeted: 4000,
      actual: 4100,
    },
    {
      categoryUid: 'cat-2',
      name: 'Mercado',
      kind: 'expense',
      budgeted: 1300,
      actual: 1250,
    },
  ],
};

const APRIL_CLOSING: MonthClosing = {
  id: 2,
  uid: 'closing-april',
  month: '2026-04',
  closedAt: 1770000000000,
  plannedIncome: 3800,
  plannedExpense: 2600,
  plannedBalance: 1200,
  actualIncome: 3900,
  actualExpense: 2550,
  actualBalance: 1350,
  categories: [],
};

function renderHistory(closings: MonthClosing[]) {
  const onRequestReopen = vi.fn();
  render(
    <FinanceClosingHistory
      closings={closings}
      onRequestReopen={onRequestReopen}
    />,
  );
  return { onRequestReopen };
}

describe('FinanceClosingHistory', () => {
  afterEach(cleanup);

  it('renders the empty message when there are no closings', () => {
    renderHistory([]);
    expect(screen.getByText('Nenhum mês fechado ainda.')).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Histórico de fechamentos' }),
    ).not.toBeInTheDocument();
  });

  it('lists the closings with month, closed-at date and balances', () => {
    renderHistory([MAY_CLOSING, APRIL_CLOSING]);
    const history = screen.getByRole('list', {
      name: 'Histórico de fechamentos',
    });
    expect(within(history).getByText('maio de 2026')).toBeInTheDocument();
    expect(within(history).getByText('abril de 2026')).toBeInTheDocument();
    expect(within(history).getAllByText(/Fechado em/)).toHaveLength(2);
    expect(within(history).getByText('R$ 1500,00')).toBeInTheDocument();
    expect(within(history).getByText('R$ 1700,00')).toBeInTheDocument();
    expect(within(history).getByText('R$ 1350,00')).toBeInTheDocument();
  });

  it('expands and collapses the per-category detail of a closing', async () => {
    renderHistory([MAY_CLOSING]);
    const detailsButton = screen.getByRole('button', { name: 'Detalhes' });
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(detailsButton);
    const detail = screen.getByRole('list', {
      name: 'Categorias de maio de 2026',
    });
    expect(within(detail).getByText('Salário')).toBeInTheDocument();
    expect(within(detail).getByText('Mercado')).toBeInTheDocument();
    expect(within(detail).getByText('R$ 1300,00')).toBeInTheDocument();
    expect(within(detail).getByText('R$ 1250,00')).toBeInTheDocument();
    const collapseButton = screen.getByRole('button', {
      name: 'Ocultar detalhes',
    });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(collapseButton);
    expect(
      screen.queryByRole('list', { name: 'Categorias de maio de 2026' }),
    ).not.toBeInTheDocument();
  });

  it('requests reopening the clicked month', async () => {
    const { onRequestReopen } = renderHistory([MAY_CLOSING, APRIL_CLOSING]);
    const items = within(
      screen.getByRole('list', { name: 'Histórico de fechamentos' }),
    ).getAllByRole('listitem');
    await userEvent.click(
      within(items[1]).getByRole('button', { name: 'Reabrir' }),
    );
    expect(onRequestReopen).toHaveBeenCalledWith('2026-04');
  });
});
