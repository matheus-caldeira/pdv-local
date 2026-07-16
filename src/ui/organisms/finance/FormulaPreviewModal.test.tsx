import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormulaPreviewModal } from './FormulaPreviewModal';
import type {
  FamilyMember,
  FinanceCategory,
  FinanceEntry,
  FinanceFormula,
} from '../../../domain/finance/finance.entity';
import type { FormulaPreview } from '../../../application/finance/automations.usecases';

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
  filter: { kind: 'income', categoryUids: [], memberUids: [] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-tax',
  outputDescription: 'DARF',
  createdAt: 1,
  updatedAt: 1,
};

const MATCH: FinanceEntry = {
  id: 1,
  uid: 'entry-1',
  description: 'Nota fiscal',
  amount: 1000,
  kind: 'income',
  categoryUid: 'cat-pj',
  memberUids: ['member-1'],
  date: 1,
  month: '2026-07',
  status: 'paid',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  createdAt: 1,
  updatedAt: 1,
};

const PREVIEW: FormulaPreview = {
  matches: [MATCH],
  total: 1000,
  generatedAmount: 155,
  previousGenerations: [],
  defaultTargetMonth: '2026-08',
  closedMonths: [],
};

const onPreview = vi.fn();
const onGenerate = vi.fn();
const onClose = vi.fn();

function renderModal() {
  return render(
    <FormulaPreviewModal
      formula={FORMULA}
      categories={CATEGORIES}
      members={MEMBERS}
      currentMonth="2026-07"
      onPreview={onPreview}
      onGenerate={onGenerate}
      onClose={onClose}
    />,
  );
}

describe('FormulaPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onPreview.mockResolvedValue(PREVIEW);
  });
  afterEach(cleanup);

  it('loads the preview for the current month with the saved filter', async () => {
    renderModal();
    expect(screen.getByText('Carregando prévia…')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    expect(onPreview).toHaveBeenCalledWith({
      formulaUid: 'formula-1',
      baseMonth: '2026-07',
      filter: { kind: 'income', categoryUids: [], memberUids: [] },
    });
    expect(screen.getByText('Total casado')).toBeInTheDocument();
    expect(screen.getByText('Valor gerado (15.5%)')).toBeInTheDocument();
    expect(screen.getByText('R$ 155,00')).toBeInTheDocument();
    expect(screen.getByLabelText('Mês de destino')).toHaveValue('2026-08');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('generates the entry and closes on success', async () => {
    onGenerate.mockResolvedValue(true);
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    );
    expect(onGenerate).toHaveBeenCalledWith({
      formulaUid: 'formula-1',
      baseMonth: '2026-07',
      filter: { kind: 'income', categoryUids: [], memberUids: [] },
      targetMonth: '2026-08',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open when generating fails', async () => {
    onGenerate.mockResolvedValue(false);
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    );
    await waitFor(() => expect(onGenerate).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('warns when the formula already generated for the base month', async () => {
    onPreview.mockResolvedValue({
      ...PREVIEW,
      previousGenerations: [MATCH],
    });
    renderModal();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'já gerou 1 lançamento(s)',
      ),
    );
  });

  it('shows an empty message and disables generation without matches', async () => {
    onPreview.mockResolvedValue({ ...PREVIEW, matches: [], total: 0 });
    renderModal();
    await waitFor(() =>
      expect(
        screen.getByText('Nenhum lançamento casa com o filtro.'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    ).toBeDisabled();
  });

  it('disables closed months and blocks a closed default target', async () => {
    onPreview.mockResolvedValue({ ...PREVIEW, closedMonths: ['2026-08'] });
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    const select = screen.getByLabelText('Mês de destino');
    const options = within(select).getAllByRole('option');
    expect(
      options.find((option) => option.getAttribute('value') === '2026-08'),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    ).toBeDisabled();
    await userEvent.selectOptions(select, '2026-09');
    expect(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    ).toBeEnabled();
    onGenerate.mockResolvedValue(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    );
    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ targetMonth: '2026-09' }),
    );
  });

  it('reloads the preview when the base month changes', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({ baseMonth: '2026-08' }),
      ),
    );
  });

  it('reloads when filter categories and members are toggled', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'PJ' }));
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ categoryUids: ['cat-pj'] }),
        }),
      ),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'PJ' }));
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ categoryUids: [] }),
        }),
      ),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ memberUids: ['member-1'] }),
        }),
      ),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ memberUids: [] }),
        }),
      ),
    );
  });

  it('clears the selected categories when the filter kind changes', async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByText('Nota fiscal')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('checkbox', { name: 'PJ' }));
    await userEvent.selectOptions(
      screen.getByLabelText('Tipo do filtro'),
      'expense',
    );
    await waitFor(() =>
      expect(onPreview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            kind: 'expense',
            categoryUids: [],
          }),
        }),
      ),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Impostos' }),
    ).not.toBeChecked();
  });

  it('keeps loading when the preview fails', async () => {
    onPreview.mockResolvedValue(null);
    renderModal();
    await waitFor(() => expect(onPreview).toHaveBeenCalled());
    expect(screen.getByText('Carregando prévia…')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Gerar lançamento' }),
    ).toBeDisabled();
  });

  it('ignores a stale preview resolved after the filter changed', async () => {
    let resolveFirst: (value: FormulaPreview) => void = () => {};
    onPreview
      .mockImplementationOnce(
        () =>
          new Promise<FormulaPreview>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue({ ...PREVIEW, defaultTargetMonth: '2026-09' });
    renderModal();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ana' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Mês de destino')).toHaveValue('2026-09'),
    );
    resolveFirst({ ...PREVIEW, defaultTargetMonth: '2026-08' });
    await waitFor(() => expect(onPreview).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Mês de destino')).toHaveValue('2026-09');
  });
});
