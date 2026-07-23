import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceEntriesFilters } from './FinanceEntriesFilters';
import { EMPTY_FINANCE_ENTRY_FILTERS } from '../../hooks/useFinanceEntries';

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

const MEMBERS = [
  { id: 1, uid: 'member-1', name: 'Ana', archived: false, createdAt: 1 },
];

const PAYMENT_METHODS = [
  {
    id: 1,
    uid: 'method-1',
    name: 'Cartão Nubank',
    type: 'credit' as const,
    closingDay: 3,
    dueDay: 10,
    archived: false,
    createdAt: 1,
  },
];

function renderFilters(overrides: Record<string, unknown> = {}) {
  const onFiltersChange = vi.fn();
  const onToggleOverdue = vi.fn();
  render(
    <FinanceEntriesFilters
      filters={EMPTY_FINANCE_ENTRY_FILTERS}
      onFiltersChange={onFiltersChange}
      categories={CATEGORIES}
      members={MEMBERS}
      paymentMethods={PAYMENT_METHODS}
      overdueMode={false}
      overdueCount={3}
      onToggleOverdue={onToggleOverdue}
      {...overrides}
    />,
  );
  return { onFiltersChange, onToggleOverdue };
}

describe('FinanceEntriesFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders search, selects and the overdue shortcut with the count', () => {
    renderFilters();
    expect(screen.getByLabelText('Buscar lançamentos')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por tipo')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por membro')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Filtrar por meio de pagamento'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Atrasadas (3)' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the text filter when typing in the search', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.type(screen.getByLabelText('Buscar lançamentos'), 'l');
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      text: 'l',
    });
  });

  it('emits the status filter', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por status'),
      'paid',
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      status: 'paid',
    });
  });

  it('emits the kind filter', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por tipo'),
      'income',
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      kind: 'income',
    });
  });

  it('emits the category filter', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por categoria'),
      'cat-1',
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      categoryUid: 'cat-1',
    });
  });

  it('emits the member filter', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por membro'),
      'member-1',
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      memberUid: 'member-1',
    });
  });

  it('emits the payment method filter', async () => {
    const { onFiltersChange } = renderFilters();
    await userEvent.selectOptions(
      screen.getByLabelText('Filtrar por meio de pagamento'),
      'method-1',
    );
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...EMPTY_FINANCE_ENTRY_FILTERS,
      paymentMethodUid: 'method-1',
    });
  });

  it('toggles the overdue mode', async () => {
    const { onToggleOverdue } = renderFilters();
    await userEvent.click(screen.getByRole('button', { name: /Atrasadas/ }));
    expect(onToggleOverdue).toHaveBeenCalled();
  });

  it('disables the filter controls while in overdue mode', () => {
    renderFilters({ overdueMode: true });
    expect(screen.getByLabelText('Buscar lançamentos')).toBeDisabled();
    expect(screen.getByLabelText('Filtrar por status')).toBeDisabled();
    expect(screen.getByLabelText('Filtrar por tipo')).toBeDisabled();
    expect(screen.getByLabelText('Filtrar por categoria')).toBeDisabled();
    expect(screen.getByLabelText('Filtrar por membro')).toBeDisabled();
    expect(
      screen.getByLabelText('Filtrar por meio de pagamento'),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Atrasadas (3)' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
