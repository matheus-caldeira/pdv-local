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
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('FinanceOverdueCard', () => {
  afterEach(cleanup);

  it('renders nothing when there are no overdue entries', () => {
    const { container } = render(
      <FinanceOverdueCard entries={[]} total={0} onMarkPaid={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the total and one row per overdue entry', () => {
    render(
      <FinanceOverdueCard
        entries={[
          entry({ uid: 'entry-1', description: 'Aluguel', amount: 1500 }),
          entry({ uid: 'entry-2', description: 'Luz', amount: 200.5 }),
        ]}
        total={1700.5}
        onMarkPaid={vi.fn()}
      />,
    );
    const section = screen.getByRole('region', { name: 'Contas atrasadas' });
    expect(section).toHaveTextContent('Atrasadas');
    expect(screen.getByText('R$ 1700,50')).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Luz')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('calls onMarkPaid with the entry uid', async () => {
    const onMarkPaid = vi.fn();
    render(
      <FinanceOverdueCard
        entries={[entry({ uid: 'entry-9', description: 'Internet' })]}
        total={1500}
        onMarkPaid={onMarkPaid}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar Internet como pago' }),
    );
    expect(onMarkPaid).toHaveBeenCalledWith('entry-9');
  });
});
