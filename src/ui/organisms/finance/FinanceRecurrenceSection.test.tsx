import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceRecurrenceSection } from './FinanceRecurrenceSection';
import type {
  FamilyMember,
  FinanceCategory,
  Recurrence,
} from '../../../domain/finance/finance.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-home',
    name: 'Moradia',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-salary',
    name: 'Salário',
    kind: 'income',
    archived: false,
    createdAt: 1,
  },
];

const MEMBERS: FamilyMember[] = [
  { id: 1, uid: 'member-1', name: 'Ana', archived: false, createdAt: 1 },
  { id: 2, uid: 'member-2', name: 'Bruno', archived: false, createdAt: 1 },
];

const EXPENSE_RECURRENCE: Recurrence = {
  id: 1,
  uid: 'rec-1',
  description: 'Aluguel',
  amount: 1500,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: ['member-1'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  createdAt: 1,
  updatedAt: 1,
};

const INCOME_RECURRENCE: Recurrence = {
  id: 2,
  uid: 'rec-2',
  description: 'Mesada',
  amount: 200,
  kind: 'income',
  categoryUid: 'cat-salary',
  memberUids: ['member-2'],
  dayOfMonth: 10,
  startMonth: '2026-01',
  endMonth: '2026-12',
  active: false,
  createdAt: 1,
  updatedAt: 1,
};

const onSave = vi.fn();
const onDelete = vi.fn();
const onLaunch = vi.fn();
const onLaunchAll = vi.fn();

function renderSection(recurrences: Recurrence[] = []) {
  return render(
    <FinanceRecurrenceSection
      recurrences={recurrences}
      categories={CATEGORIES}
      members={MEMBERS}
      currentMonth="2026-07"
      onSave={onSave}
      onDelete={onDelete}
      onLaunch={onLaunch}
      onLaunchAll={onLaunchAll}
    />,
  );
}

describe('FinanceRecurrenceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('shows the empty state when there are no recurrences', () => {
    renderSection();
    expect(
      screen.getByText('Nenhuma recorrência cadastrada.'),
    ).toBeInTheDocument();
  });

  it('closes the form via the backdrop without saving', async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lists recurrences with status, day and range', () => {
    renderSection([EXPENSE_RECURRENCE, INCOME_RECURRENCE]);
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Inativa')).toBeInTheDocument();
    expect(screen.getByText(/Dia 5 · desde/)).toBeInTheDocument();
    expect(screen.getByText(/Dia 10 ·/)).toHaveTextContent('até');
    expect(screen.getByText('R$ 1500,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument();
  });

  it('launches all recurrences of the current month', async () => {
    onLaunchAll.mockResolvedValue(true);
    renderSection([EXPENSE_RECURRENCE]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Lançar todas do mês' }),
    );
    expect(onLaunchAll).toHaveBeenCalled();
  });

  it('launches a single recurrence', async () => {
    onLaunch.mockResolvedValue(true);
    renderSection([EXPENSE_RECURRENCE]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Lançar no mês atual' }),
    );
    expect(onLaunch).toHaveBeenCalledWith('rec-1');
  });

  it('deletes a recurrence', async () => {
    onDelete.mockResolvedValue(true);
    renderSection([EXPENSE_RECURRENCE]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir recorrência Aluguel' }),
    );
    expect(onDelete).toHaveBeenCalledWith('rec-1');
  });

  it('creates a recurrence through the form', async () => {
    onSave.mockResolvedValue(true);
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    ).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Descrição'), 'Luz');
    await userEvent.type(within(dialog).getByLabelText('Valor (R$)'), '120');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    fireEvent.change(within(dialog).getByLabelText('Mês de início'), {
      target: { value: '2026-08' },
    });
    fireEvent.change(within(dialog).getByLabelText('Mês de fim (opcional)'), {
      target: { value: '2026-12' },
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    );
    expect(onSave).toHaveBeenCalledWith({
      uid: undefined,
      description: 'Luz',
      amount: 120,
      kind: 'expense',
      categoryUid: 'cat-home',
      memberUids: ['member-1'],
      dayOfMonth: 1,
      startMonth: '2026-08',
      endMonth: '2026-12',
      active: true,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the form open when saving fails', async () => {
    onSave.mockResolvedValue(false);
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('defaults amount and day to zero when blank', async () => {
    onSave.mockResolvedValue(true);
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText('Dia do mês (1-28)'));
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0, dayOfMonth: 0, endMonth: null }),
    );
  });

  it('resets the category when the kind changes', async () => {
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo'),
      'income',
    );
    expect(within(dialog).getByLabelText('Categoria')).toHaveValue('');
    expect(
      within(dialog).getByRole('option', { name: 'Salário' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    ).toBeDisabled();
  });

  it('unchecks a member when toggled twice', async () => {
    onSave.mockResolvedValue(true);
    renderSection();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova recorrência' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Bruno' }),
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-home',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ memberUids: ['member-2'] }),
    );
  });

  it('edits a recurrence keeping its values', async () => {
    onSave.mockResolvedValue(true);
    renderSection([INCOME_RECURRENCE]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar recorrência Mesada' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('Mesada');
    expect(within(dialog).getByLabelText('Valor (R$)')).toHaveValue(200);
    expect(within(dialog).getByLabelText('Categoria')).toHaveValue(
      'cat-salary',
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'Ativa' }),
    ).not.toBeChecked();
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ativa' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar recorrência' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'rec-2',
        endMonth: '2026-12',
        active: true,
      }),
    );
  });

  it('offers an archived placeholder when editing a recurrence with unknown category', async () => {
    renderSection([{ ...EXPENSE_RECURRENCE, categoryUid: 'cat-gone' }]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar recorrência Aluguel' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Categoria')).toHaveValue('cat-gone');
    expect(
      within(dialog).getByRole('option', { name: 'Categoria arquivada' }),
    ).toBeInTheDocument();
  });
});
