import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceEntriesList } from './FinanceEntriesList';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

const CATEGORIES = [
  {
    id: 1,
    uid: 'cat-1',
    name: 'Moradia',
    kind: 'expense' as const,
    archived: false,
    createdAt: 1,
  },
];

function makeEntry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 1,
    uid: 'entry-1',
    description: 'Conta de luz',
    amount: 120.5,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: ['member-1'],
    date: Date.UTC(2026, 6, 10, 12),
    month: '2026-07',
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

function renderList(
  entries: FinanceEntry[],
  overrides: Record<string, unknown> = {},
) {
  const onEdit = vi.fn();
  const onToggleStatus = vi.fn();
  render(
    <FinanceEntriesList
      entries={entries}
      categories={CATEGORIES}
      planCounts={{ 'plan-1': 10 }}
      closedMonths={[]}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      {...overrides}
    />,
  );
  return { onEdit, onToggleStatus };
}

describe('FinanceEntriesList', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the empty state when there are no entries', () => {
    renderList([]);
    expect(
      screen.getByText('Nenhum lançamento encontrado'),
    ).toBeInTheDocument();
  });

  it('renders the entry in the card list and in the table', () => {
    renderList([makeEntry()]);
    expect(screen.getAllByText('Conta de luz')).toHaveLength(2);
    expect(screen.getAllByText('R$ 120,50')).toHaveLength(2);
    expect(screen.getAllByText('Pendente')).toHaveLength(2);
    expect(screen.getAllByText(/Moradia/)).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Lançamentos' })).toBeVisible();
  });

  it('shows an expense with the minus sign and an income with the plus sign', () => {
    renderList([
      makeEntry(),
      makeEntry({
        uid: 'entry-2',
        description: 'Salário',
        kind: 'income',
        status: 'paid',
      }),
    ]);
    expect(screen.getAllByText(/^-\s*$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^\+\s*$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pago')).toHaveLength(2);
  });

  it('shows the installment badge with the plan total', () => {
    renderList([
      makeEntry({
        source: 'installment',
        sourceUid: 'plan-1',
        installmentNumber: 3,
      }),
    ]);
    expect(screen.getAllByText('Parcela 3/10')).toHaveLength(2);
  });

  it('shows the installment badge without total when the plan is unknown', () => {
    renderList([
      makeEntry({
        source: 'installment',
        sourceUid: 'plan-x',
        installmentNumber: 2,
      }),
    ]);
    expect(screen.getAllByText('Parcela 2')).toHaveLength(2);
  });

  it('shows the installment badge when the entry has no source uid', () => {
    renderList([
      makeEntry({
        source: 'installment',
        sourceUid: null,
        installmentNumber: 1,
      }),
    ]);
    expect(screen.getAllByText('Parcela 1')).toHaveLength(2);
  });

  it('shows the recurrence and formula badges', () => {
    renderList([
      makeEntry({ source: 'recurrence', sourceUid: 'rec-1' }),
      makeEntry({
        uid: 'entry-2',
        source: 'formula',
        sourceUid: 'formula-1',
      }),
    ]);
    expect(screen.getAllByText('Recorrência')).toHaveLength(2);
    expect(screen.getAllByText('Fórmula')).toHaveLength(2);
  });

  it('falls back to "Sem categoria" for unknown categories', () => {
    renderList([makeEntry({ categoryUid: 'cat-x' })]);
    expect(screen.getAllByText(/Sem categoria/).length).toBeGreaterThan(0);
  });

  it('marks a pending entry as paid through the quick action', async () => {
    const { onToggleStatus } = renderList([makeEntry()]);
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Marcar "Conta de luz" como pago',
      })[0],
    );
    expect(onToggleStatus).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'entry-1' }),
    );
  });

  it('marks a paid entry as pending through the quick action', async () => {
    const { onToggleStatus } = renderList([makeEntry({ status: 'paid' })]);
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Marcar "Conta de luz" como pendente',
      })[0],
    );
    expect(onToggleStatus).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'entry-1' }),
    );
  });

  it('opens the edit action when the month is open', async () => {
    const { onEdit } = renderList([makeEntry()]);
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Editar "Conta de luz"' })[0],
    );
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'entry-1' }),
    );
  });

  it('disables the edit action when the entry month is closed', () => {
    renderList([makeEntry()], { closedMonths: ['2026-07'] });
    for (const button of screen.getAllByRole('button', {
      name: 'Editar "Conta de luz"',
    })) {
      expect(button).toBeDisabled();
    }
    for (const button of screen.getAllByRole('button', {
      name: 'Marcar "Conta de luz" como pago',
    })) {
      expect(button).toBeEnabled();
    }
  });
});
