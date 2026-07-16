import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceEntryFormModal } from './FinanceEntryFormModal';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceEntry,
} from '../../../domain/finance/finance.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-income',
    name: 'Salário',
    kind: 'income',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-expense',
    name: 'Moradia',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
  {
    id: 3,
    uid: 'cat-archived',
    name: 'Antiga',
    kind: 'expense',
    archived: true,
    createdAt: 1,
  },
];

const SINGLE_MEMBER: FamilyMember[] = [
  { id: 1, uid: 'member-1', name: 'Ana', archived: false, createdAt: 1 },
];

const MANY_MEMBERS: FamilyMember[] = [
  ...SINGLE_MEMBER,
  { id: 2, uid: 'member-2', name: 'Bruno', archived: false, createdAt: 1 },
  { id: 3, uid: 'member-3', name: 'Carla', archived: true, createdAt: 1 },
];

function makeEntry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 1,
    uid: 'entry-1',
    description: 'Conta de luz',
    amount: 120.5,
    kind: 'expense',
    categoryUid: 'cat-expense',
    memberUids: ['member-1'],
    date: new Date(2026, 6, 10, 12).getTime(),
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

function renderModal(overrides: Record<string, unknown> = {}) {
  const onClose = vi.fn();
  const onSave = vi.fn();
  const onDelete = vi.fn();
  render(
    <FinanceEntryFormModal
      open
      entry={null}
      categories={CATEGORIES}
      members={SINGLE_MEMBER}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      {...overrides}
    />,
  );
  return { onClose, onSave, onDelete };
}

describe('FinanceEntryFormModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-selects the member when there is exactly one active member', () => {
    renderModal();
    expect(
      screen.getByRole('dialog', { name: 'Novo lançamento' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Ana')).toBeChecked();
    expect(
      screen.queryByRole('button', { name: 'Excluir' }),
    ).not.toBeInTheDocument();
  });

  it('does not pre-select members when there is more than one active', () => {
    renderModal({ members: MANY_MEMBERS });
    expect(screen.getByLabelText('Ana')).not.toBeChecked();
    expect(screen.getByLabelText('Bruno')).not.toBeChecked();
    expect(screen.queryByLabelText(/Carla/)).not.toBeInTheDocument();
  });

  it('hides archived categories from the create form', () => {
    renderModal();
    expect(
      screen.queryByRole('option', { name: /Antiga/ }),
    ).not.toBeInTheDocument();
  });

  it('saves the parsed values from the form', async () => {
    const { onSave } = renderModal({ members: MANY_MEMBERS });
    await userEvent.type(screen.getByLabelText('Descrição'), 'Aluguel');
    await userEvent.type(screen.getByLabelText('Valor (R$)'), '150.5');
    await userEvent.selectOptions(
      screen.getByLabelText('Categoria'),
      'cat-expense',
    );
    await userEvent.click(screen.getByLabelText('Bruno'));
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2026-07-20' },
    });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'paid');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith({
      description: 'Aluguel',
      amount: 150.5,
      categoryUid: 'cat-expense',
      memberUids: ['member-2'],
      date: new Date(2026, 6, 20, 12).getTime(),
      status: 'paid',
    });
  });

  it('unchecks a member when clicked twice', async () => {
    const { onSave } = renderModal({ members: MANY_MEMBERS });
    await userEvent.click(screen.getByLabelText('Ana'));
    await userEvent.click(screen.getByLabelText('Ana'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ memberUids: [] }),
    );
  });

  it('defaults the amount to zero when empty', async () => {
    const { onSave } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0, memberUids: ['member-1'] }),
    );
  });

  it('fills the form when editing an entry', () => {
    renderModal({ entry: makeEntry() });
    expect(
      screen.getByRole('dialog', { name: 'Editar lançamento' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveValue('Conta de luz');
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue(120.5);
    expect(screen.getByLabelText('Categoria')).toHaveValue('cat-expense');
    expect(screen.getByLabelText('Data')).toHaveValue('2026-07-10');
    expect(screen.getByLabelText('Data')).toBeEnabled();
    expect(screen.getByLabelText('Status')).toHaveValue('pending');
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('keeps an archived category selectable with a badge when editing', () => {
    renderModal({ entry: makeEntry({ categoryUid: 'cat-archived' }) });
    expect(
      screen.getByRole('option', { name: 'Antiga (arquivada)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Categoria arquivada')).toBeInTheDocument();
  });

  it('shows an archived member that is selected on the entry', () => {
    renderModal({
      members: MANY_MEMBERS,
      entry: makeEntry({ memberUids: ['member-3'] }),
    });
    expect(screen.getByLabelText('Carla (arquivado)')).toBeChecked();
  });

  it('locks the date with a hint when editing a derived entry', () => {
    renderModal({
      entry: makeEntry({
        source: 'installment',
        sourceUid: 'plan-1',
        installmentNumber: 1,
      }),
    });
    expect(screen.getByLabelText('Data')).toBeDisabled();
    expect(
      screen.getByText(
        'A data de lançamentos gerados (parcela, recorrência ou fórmula) não pode ser alterada.',
      ),
    ).toBeInTheDocument();
  });

  it('deletes the entry after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDelete } = renderModal({ entry: makeEntry() });
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onDelete).toHaveBeenCalledWith('entry-1');
  });

  it('does not delete when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onDelete } = renderModal({ entry: makeEntry() });
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
