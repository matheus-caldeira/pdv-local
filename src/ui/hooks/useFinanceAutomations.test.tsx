import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFinanceAutomations } from './useFinanceAutomations';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import { currentMonthKey } from '../../domain/finance/finance.rules';
import type {
  FinanceFormula,
  InstallmentPlan,
  Recurrence,
} from '../../domain/finance/finance.entity';
import type {
  FormulaPreview,
  InstallmentPreviewLine,
} from '../../application/finance/automations.usecases';

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

vi.mock('../../app/container', () => ({
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
  createdAt: 1,
};

const PREVIEW: FormulaPreview = {
  matches: [],
  total: 0,
  generatedAmount: 0,
  previousGenerations: [],
  defaultTargetMonth: '2026-08',
  closedMonths: [],
};

const PREVIEW_LINES: InstallmentPreviewLine[] = [
  { month: '2026-08', amount: 50 },
  { month: '2026-09', amount: 50 },
];

function Probe() {
  const automations = useFinanceAutomations();
  const [result, setResult] = useState('');
  return (
    <div>
      <span>loading:{automations.loading ? 'yes' : 'no'}</span>
      <span>formulas:{automations.formulas.length}</span>
      <span>recurrences:{automations.recurrences.length}</span>
      <span>plans:{automations.plans.length}</span>
      <span>categories:{automations.categories.length}</span>
      <span>members:{automations.members.length}</span>
      <button
        onClick={() =>
          automations.saveFormula({
            name: 'DARF PJ',
            percent: 15.5,
            filter: { kind: 'income', categoryUids: [], memberUids: [] },
            outputKind: 'expense',
            outputCategoryUid: 'cat-tax',
            outputDescription: 'DARF',
          })
        }
      >
        saveFormula
      </button>
      <button onClick={() => automations.deleteFormula('formula-1')}>
        deleteFormula
      </button>
      <button
        onClick={async () => {
          const preview = await automations.previewFormula({
            formulaUid: 'formula-1',
            baseMonth: '2026-07',
          });
          setResult(preview === null ? 'preview:null' : 'preview:ok');
        }}
      >
        previewFormula
      </button>
      <button
        onClick={() =>
          automations.generateFormulaEntry({
            formulaUid: 'formula-1',
            baseMonth: '2026-07',
            filter: { kind: 'income', categoryUids: [], memberUids: [] },
            targetMonth: '2026-08',
          })
        }
      >
        generateFormulaEntry
      </button>
      <button
        onClick={() =>
          automations.saveRecurrence({
            description: 'Aluguel',
            amount: 1500,
            kind: 'expense',
            categoryUid: 'cat-home',
            memberUids: ['member-1'],
            dayOfMonth: 5,
            startMonth: '2026-01',
            endMonth: null,
            active: true,
          })
        }
      >
        saveRecurrence
      </button>
      <button onClick={() => automations.deleteRecurrence('rec-1')}>
        deleteRecurrence
      </button>
      <button onClick={() => automations.launchRecurrence('rec-1')}>
        launchRecurrence
      </button>
      <button onClick={() => automations.launchAllRecurrences()}>
        launchAllRecurrences
      </button>
      <button
        onClick={() =>
          automations.createInstallmentPlan({
            description: 'Geladeira',
            totalAmount: 3000,
            installmentCount: 10,
            firstMonth: '2026-08',
            dayOfMonth: 10,
            kind: 'expense',
            categoryUid: 'cat-home',
            memberUids: ['member-1'],
          })
        }
      >
        createInstallmentPlan
      </button>
      <button onClick={() => automations.deleteInstallmentPlan('plan-1')}>
        deleteInstallmentPlan
      </button>
      <button
        onClick={() => {
          const lines = automations.previewInstallments(100, 2, '2026-08');
          setResult(lines === null ? 'lines:null' : `lines:${lines.length}`);
        }}
      >
        previewInstallments
      </button>
      <span aria-label="resultado">{result}</span>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useFinanceAutomations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceFormulas.mockResolvedValue(right([FORMULA]));
    listFinanceRecurrences.mockResolvedValue(right([RECURRENCE]));
    listFinanceInstallmentPlans.mockResolvedValue(right([PLAN]));
    listFinanceCategories.mockResolvedValue(
      right([
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
          uid: 'cat-old',
          name: 'Antiga',
          kind: 'expense',
          archived: true,
          createdAt: 1,
        },
      ]),
    );
    listFinanceMembers.mockResolvedValue(
      right([
        { id: 1, uid: 'member-1', name: 'Eu', archived: false, createdAt: 1 },
        {
          id: 2,
          uid: 'member-2',
          name: 'Ex',
          archived: true,
          createdAt: 1,
        },
      ]),
    );
  });
  afterEach(cleanup);

  it('loads the lists and keeps only active categories and members', async () => {
    renderProbe();
    expect(screen.getByText('loading:yes')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    expect(screen.getByText('formulas:1')).toBeInTheDocument();
    expect(screen.getByText('recurrences:1')).toBeInTheDocument();
    expect(screen.getByText('plans:1')).toBeInTheDocument();
    expect(screen.getByText('categories:1')).toBeInTheDocument();
    expect(screen.getByText('members:1')).toBeInTheDocument();
  });

  it('toasts when a list fails to load', async () => {
    listFinanceFormulas.mockResolvedValue(left(new FakeError('falha listas')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha listas'),
    );
    expect(screen.getByText('formulas:0')).toBeInTheDocument();
    expect(screen.getByText('loading:no')).toBeInTheDocument();
  });

  it('saves a formula and reloads', async () => {
    saveFinanceFormula.mockResolvedValue(right(FORMULA));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('saveFormula'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Fórmula salva!'),
    );
    expect(saveFinanceFormula).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'DARF PJ', percent: 15.5 }),
    );
    expect(listFinanceFormulas).toHaveBeenCalledTimes(2);
  });

  it('toasts and does not reload when saving a formula fails', async () => {
    saveFinanceFormula.mockResolvedValue(left(new FakeError('percentual')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('saveFormula'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('percentual'),
    );
    expect(listFinanceFormulas).toHaveBeenCalledTimes(1);
  });

  it('deletes a formula', async () => {
    deleteFinanceFormula.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('deleteFormula'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Fórmula excluída!'),
    );
    expect(deleteFinanceFormula).toHaveBeenCalledWith('formula-1');
  });

  it('returns the formula preview on success', async () => {
    previewFinanceFormula.mockResolvedValue(right(PREVIEW));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('previewFormula'));
    await waitFor(() =>
      expect(screen.getByLabelText('resultado')).toHaveTextContent(
        'preview:ok',
      ),
    );
    expect(previewFinanceFormula).toHaveBeenCalledWith({
      formulaUid: 'formula-1',
      baseMonth: '2026-07',
    });
  });

  it('returns null and toasts when the formula preview fails', async () => {
    previewFinanceFormula.mockResolvedValue(left(new FakeError('sem base')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('previewFormula'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('sem base'),
    );
    expect(screen.getByLabelText('resultado')).toHaveTextContent(
      'preview:null',
    );
  });

  it('generates a formula entry', async () => {
    generateFinanceFormulaEntry.mockResolvedValue(right({ uid: 'entry-1' }));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('generateFormulaEntry'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Lançamento gerado!',
      ),
    );
    expect(generateFinanceFormulaEntry).toHaveBeenCalledWith(
      expect.objectContaining({ targetMonth: '2026-08' }),
    );
  });

  it('saves and deletes a recurrence', async () => {
    saveFinanceRecurrence.mockResolvedValue(right(RECURRENCE));
    deleteFinanceRecurrence.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('saveRecurrence'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Recorrência salva!',
      ),
    );
    await userEvent.click(screen.getByText('deleteRecurrence'));
    await waitFor(() =>
      expect(screen.getAllByRole('status').at(-1)).toHaveTextContent(
        'Recorrência excluída!',
      ),
    );
    expect(deleteFinanceRecurrence).toHaveBeenCalledWith('rec-1');
  });

  it('launches a recurrence in the current real month', async () => {
    launchFinanceRecurrence.mockResolvedValue(right({ uid: 'entry-1' }));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('launchRecurrence'));
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

  it('launches all recurrences and reports launched and skipped', async () => {
    launchAllFinanceRecurrences.mockResolvedValue(
      right({ launched: 2, skipped: 1 }),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('launchAllRecurrences'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '2 lançada(s), 1 pulada(s)',
      ),
    );
    expect(launchAllFinanceRecurrences).toHaveBeenCalledWith(
      currentMonthKey(Date.now()),
    );
    expect(listFinanceRecurrences).toHaveBeenCalledTimes(2);
  });

  it('toasts when launching all recurrences fails', async () => {
    launchAllFinanceRecurrences.mockResolvedValue(
      left(new FakeError('mês fechado')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('launchAllRecurrences'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('mês fechado'),
    );
    expect(listFinanceRecurrences).toHaveBeenCalledTimes(1);
  });

  it('creates an installment plan adding uid and createdAt', async () => {
    createFinanceInstallmentPlan.mockResolvedValue(right(PLAN));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('createInstallmentPlan'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Parcelamento criado!',
      ),
    );
    expect(createFinanceInstallmentPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Geladeira',
        totalAmount: 3000,
        installmentCount: 10,
        uid: expect.any(String),
        createdAt: expect.any(Number),
      }),
    );
  });

  it('deletes an installment plan', async () => {
    deleteFinanceInstallmentPlan.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('deleteInstallmentPlan'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Parcelamento excluído!',
      ),
    );
    expect(deleteFinanceInstallmentPlan).toHaveBeenCalledWith('plan-1');
  });

  it('returns the installment preview lines on success', async () => {
    previewFinanceInstallments.mockReturnValue(right(PREVIEW_LINES));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('previewInstallments'));
    expect(screen.getByLabelText('resultado')).toHaveTextContent('lines:2');
    expect(previewFinanceInstallments).toHaveBeenCalledWith(100, 2, '2026-08');
  });

  it('returns null and toasts when the installment preview fails', async () => {
    previewFinanceInstallments.mockReturnValue(
      left(new FakeError('parcelas inválidas')),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('loading:no')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('previewInstallments'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'parcelas inválidas',
      ),
    );
    expect(screen.getByLabelText('resultado')).toHaveTextContent('lines:null');
  });
});
