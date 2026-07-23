import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceAutomationsPage } from './FinanceAutomationsPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import { currentMonthKey } from '../../../domain/finance/finance.rules';
import type {
  FinanceFormula,
  InstallmentPlan,
  Recurrence,
} from '../../../domain/finance/finance.entity';

const listFinanceFormulas = vi.fn();
const listFinanceRecurrences = vi.fn();
const listFinanceInstallmentPlans = vi.fn();
const listFinanceCategories = vi.fn();
const listFinanceMembers = vi.fn();
const saveFinanceFormula = vi.fn();
const deleteFinanceFormula = vi.fn();
const previewFinanceFormula = vi.fn();
const generateFinanceFormulaEntry = vi.fn();
const saveFinanceRecurrence = vi.fn();
const deleteFinanceRecurrence = vi.fn();
const launchFinanceRecurrence = vi.fn();
const launchAllFinanceRecurrences = vi.fn();
const createFinanceInstallmentPlan = vi.fn();
const deleteFinanceInstallmentPlan = vi.fn();
const previewFinanceInstallments = vi.fn();

vi.mock('../../../app/container', () => ({
  container: {
    listFinanceFormulas: () => listFinanceFormulas(),
    listFinanceRecurrences: () => listFinanceRecurrences(),
    listFinanceInstallmentPlans: () => listFinanceInstallmentPlans(),
    listFinanceCategories: () => listFinanceCategories(),
    listFinanceMembers: () => listFinanceMembers(),
    saveFinanceFormula: (input: unknown) => saveFinanceFormula(input),
    deleteFinanceFormula: (uid: string) => deleteFinanceFormula(uid),
    previewFinanceFormula: (input: unknown) => previewFinanceFormula(input),
    generateFinanceFormulaEntry: (input: unknown) =>
      generateFinanceFormulaEntry(input),
    saveFinanceRecurrence: (input: unknown) => saveFinanceRecurrence(input),
    deleteFinanceRecurrence: (uid: string) => deleteFinanceRecurrence(uid),
    launchFinanceRecurrence: (uid: string, month: string) =>
      launchFinanceRecurrence(uid, month),
    launchAllFinanceRecurrences: (month: string) =>
      launchAllFinanceRecurrences(month),
    createFinanceInstallmentPlan: (input: unknown) =>
      createFinanceInstallmentPlan(input),
    deleteFinanceInstallmentPlan: (uid: string) =>
      deleteFinanceInstallmentPlan(uid),
    previewFinanceInstallments: (
      total: number,
      count: number,
      firstMonth: string,
    ) => previewFinanceInstallments(total, count, firstMonth),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const RECURRENCE: Recurrence = {
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
  paymentMethodUid: null,
  createdAt: 1,
  updatedAt: 1,
};

const PLAN: InstallmentPlan = {
  id: 1,
  uid: 'plan-1',
  description: 'Geladeira',
  totalAmount: 3000,
  installmentCount: 10,
  firstMonth: '2026-08',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-home',
  memberUids: ['member-1'],
  paymentMethodUid: null,
  createdAt: 1,
};

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

function renderPage() {
  return render(
    <ToastProvider>
      <FinanceAutomationsPage />
    </ToastProvider>,
  );
}

describe('FinanceAutomationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceFormulas.mockResolvedValue(right([FORMULA]));
    listFinanceRecurrences.mockResolvedValue(right([RECURRENCE]));
    listFinanceInstallmentPlans.mockResolvedValue(right([PLAN]));
    listFinanceCategories.mockResolvedValue(right([]));
    listFinanceMembers.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('shows the loading state while the lists load', () => {
    listFinanceFormulas.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando automações…')).toBeInTheDocument();
    expect(screen.queryByText('Recorrências')).not.toBeInTheDocument();
  });

  it('renders the three sections with their data', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Recorrências')).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('heading', { name: 'Automações' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Parcelados')).toBeInTheDocument();
    expect(screen.getByText('Fórmulas')).toBeInTheDocument();
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Geladeira')).toBeInTheDocument();
    expect(screen.getByText('DARF PJ')).toBeInTheDocument();
  });

  it('renders the empty states when there is no data', async () => {
    listFinanceFormulas.mockResolvedValue(right([]));
    listFinanceRecurrences.mockResolvedValue(right([]));
    listFinanceInstallmentPlans.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText('Nenhuma recorrência cadastrada.'),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Nenhum parcelamento cadastrado.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nenhuma fórmula cadastrada.')).toBeInTheDocument();
  });

  it('toasts when loading fails', async () => {
    listFinanceRecurrences.mockResolvedValue(
      left(new FakeError('falha ao listar')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha ao listar'),
    );
    expect(
      screen.getByText('Nenhuma recorrência cadastrada.'),
    ).toBeInTheDocument();
  });

  it('launches all recurrences of the current real month', async () => {
    launchAllFinanceRecurrences.mockResolvedValue(
      right({ launched: 1, skipped: 2 }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Recorrências')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Lançar todas do mês' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '1 lançada(s), 2 pulada(s)',
      ),
    );
    expect(launchAllFinanceRecurrences).toHaveBeenCalledWith(
      currentMonthKey(Date.now()),
    );
  });

  it('launches a single recurrence in the current real month', async () => {
    launchFinanceRecurrence.mockResolvedValue(right({ uid: 'entry-1' }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Recorrências')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Lançar no mês atual' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Recorrência lançada!',
      ),
    );
    expect(launchFinanceRecurrence).toHaveBeenCalledWith(
      'rec-1',
      currentMonthKey(Date.now()),
    );
  });
});
