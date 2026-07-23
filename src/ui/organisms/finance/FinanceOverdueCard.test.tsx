import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceOverdueCard } from './FinanceOverdueCard';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

function entry(overrides: Partial<FinanceEntry>): FinanceEntry {
  return {
    uid: 'entry-1',
    description: 'Aluguel',
    amount: 1500,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: ['member-1'],
    date: Date.UTC(2026, 5, 10, 12),
    month: '2026-06',
    status: 'pending',
    source: 'manual',
    sourceUid: null,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: null,
    invoiceMonth: null,
    invoiceUid: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('FinanceOverdueCard', () => {
  afterEach(cleanup);

  it('renders nothing when there are no overdue entries', () => {
    const { container } = render(
      <FinanceOverdueCard
        entries={[]}
        expenseTotal={0}
        incomeTotal={0}
        onMarkPaid={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the expense total and one row per overdue entry', () => {
    render(
      <FinanceOverdueCard
        entries={[
          entry({ uid: 'entry-1', description: 'Aluguel', amount: 1500 }),
          entry({ uid: 'entry-2', description: 'Luz', amount: 200.5 }),
        ]}
        expenseTotal={1700.5}
        incomeTotal={0}
        onMarkPaid={vi.fn()}
      />,
    );
    const section = screen.getByRole('region', { name: 'Contas atrasadas' });
    expect(section).toHaveTextContent('Atrasadas');
    expect(screen.getByText('R$ 1700,50')).toHaveClass('text-danger');
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('A receber')).not.toBeInTheDocument();
  });

  it('shows a separate line for overdue incomes', () => {
    render(
      <FinanceOverdueCard
        entries={[
          entry({ uid: 'entry-1', description: 'Aluguel', amount: 1500 }),
          entry({
            uid: 'entry-2',
            description: 'Freela',
            amount: 900,
            kind: 'income',
          }),
        ]}
        expenseTotal={1500}
        incomeTotal={900}
        onMarkPaid={vi.fn()}
      />,
    );
    expect(screen.getByText('A receber')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 900,00')).toHaveLength(2);
    for (const amount of screen.getAllByText('R$ 900,00')) {
      expect(amount).toHaveClass('text-success');
    }
    for (const amount of screen.getAllByText('R$ 1500,00')) {
      expect(amount).toHaveClass('text-danger');
    }
  });

  it('calls onMarkPaid with the entry uid', async () => {
    const onMarkPaid = vi.fn();
    render(
      <FinanceOverdueCard
        entries={[entry({ uid: 'entry-9', description: 'Internet' })]}
        expenseTotal={1500}
        incomeTotal={0}
        onMarkPaid={onMarkPaid}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar Internet como pago' }),
    );
    expect(onMarkPaid).toHaveBeenCalledWith('entry-9');
  });
});
