import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FinanceEntriesPage } from './FinanceEntriesPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import type {
  FinanceEntry,
  MonthClosing,
} from '../../../domain/finance/finance.entity';

const listFinanceEntries = vi.fn();
const listOverdueFinanceEntries = vi.fn();
const listFinanceCategories = vi.fn();
const listFinanceMembers = vi.fn();
const listFinanceInstallmentPlans = vi.fn();
const listFinanceClosings = vi.fn();
const createFinanceEntry = vi.fn();
const updateFinanceEntry = vi.fn();
const deleteFinanceEntry = vi.fn();
const setFinanceEntryStatus = vi.fn();

vi.mock('../../../app/container', () => ({
  container: {
    listFinanceEntries: (filter: unknown) => listFinanceEntries(filter),
    listOverdueFinanceEntries: (nowMs: number) =>
      listOverdueFinanceEntries(nowMs),
    listFinanceCategories: () => listFinanceCategories(),
    listFinanceMembers: () => listFinanceMembers(),
    listFinanceInstallmentPlans: () => listFinanceInstallmentPlans(),
    listFinanceClosings: () => listFinanceClosings(),
    createFinanceEntry: (input: unknown) => createFinanceEntry(input),
    updateFinanceEntry: (uid: string, input: unknown) =>
      updateFinanceEntry(uid, input),
    deleteFinanceEntry: (uid: string) => deleteFinanceEntry(uid),
    setFinanceEntryStatus: (uid: string, status: string) =>
      setFinanceEntryStatus(uid, status),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeEntry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    id: 1,
    uid: 'entry-1',
    description: 'Conta de luz',
    amount: 120.5,
    kind: 'expense',
    categoryUid: 'cat-1',
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

function makeClosing(month: string): MonthClosing {
  return {
    id: 1,
    uid: `closing-${month}`,
    month,
    closedAt: 1,
    plannedIncome: 0,
    plannedExpense: 0,
    plannedBalance: 0,
    actualIncome: 0,
    actualExpense: 0,
    actualBalance: 0,
    categories: [],
  };
}

const CATEGORY = {
  id: 1,
  uid: 'cat-1',
  name: 'Moradia',
  kind: 'expense' as const,
  archived: false,
  createdAt: 1,
};

const MEMBER = {
  id: 1,
  uid: 'member-1',
  name: 'Ana',
  archived: false,
  createdAt: 1,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/finance/entries?month=2026-07']}>
      <ToastProvider>
        <FinanceEntriesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('FinanceEntriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceEntries.mockResolvedValue(right([makeEntry()]));
    listOverdueFinanceEntries.mockResolvedValue(
      right([
        makeEntry({
          uid: 'entry-old',
          description: 'Fatura antiga',
          month: '2026-05',
          date: new Date(2026, 4, 10, 12).getTime(),
        }),
      ]),
    );
    listFinanceCategories.mockResolvedValue(right([CATEGORY]));
    listFinanceMembers.mockResolvedValue(right([MEMBER]));
    listFinanceInstallmentPlans.mockResolvedValue(right([]));
    listFinanceClosings.mockResolvedValue(right([]));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the loading state while entries load', () => {
    listFinanceEntries.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows the empty state when the month has no entries', async () => {
    listFinanceEntries.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Nenhum lançamento encontrado'),
      ).toBeInTheDocument(),
    );
  });

  it('shows a toast when loading fails', async () => {
    listFinanceEntries.mockResolvedValue(left(new FakeError('falha lista')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha lista'),
    );
  });

  it('renders the entries of the selected month', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    expect(listFinanceEntries).toHaveBeenCalledWith({ month: '2026-07' });
    expect(
      screen.getByRole('button', { name: 'Atrasadas (1)' }),
    ).toBeInTheDocument();
  });

  it('creates an entry through the modal', async () => {
    createFinanceEntry.mockResolvedValue(right(makeEntry()));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Novo lançamento/ }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Novo lançamento' });
    await userEvent.type(within(dialog).getByLabelText('Descrição'), 'Água');
    await userEvent.type(within(dialog).getByLabelText('Valor (R$)'), '80');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Categoria'),
      'cat-1',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(createFinanceEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Água',
        amount: 80,
        categoryUid: 'cat-1',
        memberUids: ['member-1'],
        status: 'pending',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Lançamento criado');
  });

  it('keeps the modal open when creating fails', async () => {
    createFinanceEntry.mockResolvedValue(left(new FakeError('valor inválido')));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Novo lançamento/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('valor inválido'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('updates an entry through the edit modal', async () => {
    updateFinanceEntry.mockResolvedValue(right(makeEntry()));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Editar "Conta de luz"' })[0],
    );
    const dialog = screen.getByRole('dialog', { name: 'Editar lançamento' });
    await userEvent.clear(within(dialog).getByLabelText('Valor (R$)'));
    await userEvent.type(within(dialog).getByLabelText('Valor (R$)'), '130');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(updateFinanceEntry).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ amount: 130 }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the modal open when updating fails', async () => {
    updateFinanceEntry.mockResolvedValue(left(new FakeError('mês fechado')));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Editar "Conta de luz"' })[0],
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês fechado'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the modal open when deleting fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteFinanceEntry.mockResolvedValue(left(new FakeError('falha excluir')));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Editar "Conta de luz"' })[0],
    );
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha excluir'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('deletes an entry through the edit modal', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteFinanceEntry.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', { name: 'Editar "Conta de luz"' })[0],
    );
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(deleteFinanceEntry).toHaveBeenCalledWith('entry-1');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the modal via the backdrop without saving', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Novo lançamento/ }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createFinanceEntry).not.toHaveBeenCalled();
  });

  it('marks a pending entry as paid through the quick action', async () => {
    setFinanceEntryStatus.mockResolvedValue(
      right(makeEntry({ status: 'paid' })),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Marcar "Conta de luz" como pago',
      })[0],
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'paid');
  });

  it('marks a paid entry as pending through the quick action', async () => {
    listFinanceEntries.mockResolvedValue(
      right([makeEntry({ status: 'paid' })]),
    );
    setFinanceEntryStatus.mockResolvedValue(right(makeEntry()));
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Marcar "Conta de luz" como pendente',
      })[0],
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'pending');
  });

  it('shows the overdue entries when toggling the shortcut', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Conta de luz').length).toBeGreaterThan(0),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Atrasadas (1)' }),
    );
    await waitFor(() =>
      expect(screen.getAllByText('Fatura antiga').length).toBeGreaterThan(0),
    );
    expect(screen.queryByText('Conta de luz')).not.toBeInTheDocument();
  });

  it('blocks create and edit but keeps pay active when the month is closed', async () => {
    listFinanceClosings.mockResolvedValue(right([makeClosing('2026-07')]));
    setFinanceEntryStatus.mockResolvedValue(
      right(makeEntry({ status: 'paid' })),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Este mês está fechado/)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: /Novo lançamento/ }),
    ).toBeDisabled();
    for (const button of screen.getAllByRole('button', {
      name: 'Editar "Conta de luz"',
    })) {
      expect(button).toBeDisabled();
    }
    await userEvent.click(
      screen.getAllByRole('button', {
        name: 'Marcar "Conta de luz" como pago',
      })[0],
    );
    expect(setFinanceEntryStatus).toHaveBeenCalledWith('entry-1', 'paid');
  });
});
