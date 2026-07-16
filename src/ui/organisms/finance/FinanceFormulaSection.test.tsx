import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceFormulaSection } from './FinanceFormulaSection';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceFormula,
} from '../../../domain/finance/finance.entity';

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-pj',
    name: 'PJ',
    kind: 'income',
    archived: false,
    createdAt: 1,
  },
  {
    id: 2,
    uid: 'cat-tax',
    name: 'Impostos',
    kind: 'expense',
    archived: false,
    createdAt: 1,
  },
];

const MEMBERS: FamilyMember[] = [
  { id: 1, uid: 'member-1', name: 'Ana', archived: false, createdAt: 1 },
];

const FORMULA: FinanceFormula = {
  id: 1,
  uid: 'formula-1',
  name: 'DARF PJ',
  percent: 15.5,
  filter: {
    kind: 'income',
    categoryUids: ['cat-pj'],
    memberUids: ['member-1'],
  },
  outputKind: 'expense',
  outputCategoryUid: 'cat-tax',
  outputDescription: 'DARF',
  createdAt: 1,
  updatedAt: 1,
};

const onSave = vi.fn();
const onDelete = vi.fn();
const onPreview = vi.fn();
const onGenerate = vi.fn();

function renderSection(formulas: FinanceFormula[] = []) {
  return render(
    <FinanceFormulaSection
      formulas={formulas}
      categories={CATEGORIES}
      members={MEMBERS}
      currentMonth="2026-07"
      onSave={onSave}
      onDelete={onDelete}
      onPreview={onPreview}
      onGenerate={onGenerate}
    />,
  );
}

describe('FinanceFormulaSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onPreview.mockResolvedValue(null);
  });
  afterEach(cleanup);

  it('shows the empty state when there are no formulas', () => {
    renderSection();
    expect(screen.getByText('Nenhuma fórmula cadastrada.')).toBeInTheDocument();
  });

  it('closes the form via the backdrop without saving', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lists formulas with percent and output', () => {
    renderSection([FORMULA]);
    expect(screen.getByText('DARF PJ')).toBeInTheDocument();
    expect(screen.getByText('15.5%')).toBeInTheDocument();
    expect(screen.getByText('Saída: DARF')).toBeInTheDocument();
  });

  it('deletes a formula', async () => {
    onDelete.mockResolvedValue(true);
    renderSection([FORMULA]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir fórmula DARF PJ' }),
    );
    expect(onDelete).toHaveBeenCalledWith('formula-1');
  });

  it('creates a formula through the form', async () => {
    onSave.mockResolvedValue(true);
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    ).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'DARF');
    await userEvent.type(
      within(dialog).getByLabelText('Percentual (%)'),
      '15.5',
    );
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'PJ' }));
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria de saída'),
      'cat-tax',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Descrição de saída'),
      'DARF mensal',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    );
    expect(onSave).toHaveBeenCalledWith({
      uid: undefined,
      name: 'DARF',
      percent: 15.5,
      filter: {
        kind: 'income',
        categoryUids: ['cat-pj'],
        memberUids: ['member-1'],
      },
      outputKind: 'expense',
      outputCategoryUid: 'cat-tax',
      outputDescription: 'DARF mensal',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the form open when saving fails and defaults percent to zero', async () => {
    onSave.mockResolvedValue(false);
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria de saída'),
      'cat-tax',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    );
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ percent: 0 }),
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits a formula keeping its values', async () => {
    onSave.mockResolvedValue(true);
    renderSection([FORMULA]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar fórmula DARF PJ' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('DARF PJ');
    expect(within(dialog).getByLabelText('Percentual (%)')).toHaveValue(15.5);
    expect(within(dialog).getByRole('checkbox', { name: 'PJ' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Ana' })).toBeChecked();
    expect(within(dialog).getByLabelText('Categoria de saída')).toHaveValue(
      'cat-tax',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'formula-1', name: 'DARF PJ' }),
    );
  });

  it('clears filter categories when the filter kind changes', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'PJ' }));
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo do filtro'),
      'expense',
    );
    expect(
      within(dialog).getByRole('checkbox', { name: 'Impostos' }),
    ).not.toBeChecked();
  });

  it('clears the output category when the output kind changes', async () => {
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria de saída'),
      'cat-tax',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Tipo de saída'),
      'income',
    );
    expect(within(dialog).getByLabelText('Categoria de saída')).toHaveValue('');
    expect(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    ).toBeDisabled();
  });

  it('unchecks filter categories and members when toggled twice', async () => {
    onSave.mockResolvedValue(true);
    renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Nova fórmula' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'PJ' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'PJ' }));
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: 'Ana' }),
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria de saída'),
      'cat-tax',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar fórmula' }),
    );
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ categoryUids: [], memberUids: [] }),
      }),
    );
  });

  it('opens and closes the generation preview modal', async () => {
    renderSection([FORMULA]);
    await userEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Gerar DARF PJ');
    await waitFor(() => expect(onPreview).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
