import { describe, expect, it, vi } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  EmptyMemberSelectionError,
  FinanceFormulaNotFoundError,
  FormulaHasNoMatchesError,
  InstallmentPlanNotFoundError,
  InvalidFinanceAmountError,
  InvalidInstallmentCountError,
  InvalidMonthError,
  InvalidPercentError,
  InvalidRecurrenceRangeError,
  MonthClosedError,
  RecurrenceAlreadyLaunchedError,
  RecurrenceNotFoundError,
  RecurrenceOutOfRangeError,
} from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  MonthKey,
  NewFinanceEntry,
  NewInstallmentPlan,
  NewMonthClosing,
} from '../../domain/finance/finance.entity';
import { dateForMonthDay } from '../../domain/finance/finance.rules';
import {
  FakeFinanceAutomationRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
  makeFakeUnitOfWork,
} from './fakes';
import {
  makeCreateInstallmentPlan,
  makeDeleteFormula,
  makeDeleteInstallmentPlan,
  makeDeleteRecurrence,
  makeGenerateFormulaEntry,
  makeLaunchAllRecurrences,
  makeLaunchRecurrence,
  makeListFormulas,
  makeListPlans,
  makeListRecurrences,
  makePreviewFormula,
  makePreviewInstallments,
  makeSaveFormula,
  makeSaveRecurrence,
  type FormulaInput,
  type RecurrenceInput,
} from './automations.usecases';

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const makeClosing = (month: MonthKey): NewMonthClosing => ({
  uid: createUid(),
  month,
  closedAt: 1,
  plannedIncome: 0,
  plannedExpense: 0,
  plannedBalance: 0,
  actualIncome: 0,
  actualExpense: 0,
  actualBalance: 0,
  categories: [],
});

const makeStoredEntry = (
  overrides: Partial<NewFinanceEntry> = {},
): NewFinanceEntry => {
  const month = overrides.month ?? '2026-07';
  return {
    uid: createUid(),
    description: 'Mercado da semana',
    amount: 120,
    kind: 'expense',
    categoryUid: 'cat-market',
    memberUids: ['member-me'],
    date: dateForMonthDay(month, 10),
    month,
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
};

const formulaInput = (overrides: Partial<FormulaInput> = {}): FormulaInput => ({
  name: 'DARF PJ',
  percent: 15.5,
  filter: { kind: 'income', categoryUids: [], memberUids: [] },
  outputKind: 'expense',
  outputCategoryUid: 'cat-tax',
  outputDescription: 'DARF',
  ...overrides,
});

const recurrenceInput = (
  overrides: Partial<RecurrenceInput> = {},
): RecurrenceInput => ({
  description: 'Aluguel',
  amount: 1500,
  kind: 'expense',
  categoryUid: 'cat-housing',
  memberUids: ['member-me'],
  dayOfMonth: 5,
  startMonth: '2026-01',
  endMonth: null,
  active: true,
  ...overrides,
});

const planInput = (
  overrides: Partial<NewInstallmentPlan> = {},
): NewInstallmentPlan => ({
  uid: createUid(),
  description: 'Notebook',
  totalAmount: 100.02,
  installmentCount: 3,
  firstMonth: '2026-07',
  dayOfMonth: 10,
  kind: 'expense',
  categoryUid: 'cat-shopping',
  memberUids: ['member-me'],
  paymentMethodUid: null,
  createdAt: 1,
  ...overrides,
});

const setup = () => {
  const entries = new FakeFinanceEntryRepository();
  const automations = new FakeFinanceAutomationRepository();
  const closings = new FakeFinanceClosingRepository();
  const uow = makeFakeUnitOfWork({
    financeEntries: entries,
    financeAutomations: automations,
    financeClosings: closings,
  });
  return {
    entries,
    automations,
    closings,
    listFormulas: makeListFormulas(automations),
    saveFormula: makeSaveFormula(automations),
    deleteFormula: makeDeleteFormula(automations),
    previewFormula: makePreviewFormula(entries, automations, closings),
    generateFormulaEntry: makeGenerateFormulaEntry(
      entries,
      automations,
      closings,
    ),
    listRecurrences: makeListRecurrences(automations),
    saveRecurrence: makeSaveRecurrence(automations),
    deleteRecurrence: makeDeleteRecurrence(automations),
    launchRecurrence: makeLaunchRecurrence(entries, automations, closings),
    launchAllRecurrences: makeLaunchAllRecurrences(
      entries,
      automations,
      closings,
    ),
    listPlans: makeListPlans(automations),
    createInstallmentPlan: makeCreateInstallmentPlan(uow),
    deleteInstallmentPlan: makeDeleteInstallmentPlan(uow),
    previewInstallments: makePreviewInstallments(),
  };
};

describe('makeListFormulas', () => {
  it('lista as fórmulas salvas', async () => {
    const { saveFormula, listFormulas } = setup();
    const created = unwrap(await saveFormula(formulaInput()));

    const result = unwrap(await listFormulas());

    expect(result.map((formula) => formula.uid)).toEqual([created.uid]);
  });

  it('propaga falha de infraestrutura', async () => {
    const { automations, listFormulas } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await listFormulas())).toBe(error);
  });
});

describe('makeSaveFormula', () => {
  it('cria fórmula com uid e timestamps', async () => {
    const { saveFormula } = setup();

    const created = unwrap(await saveFormula(formulaInput()));

    expect(created.uid).toBeTruthy();
    expect(created.name).toBe('DARF PJ');
    expect(created.percent).toBe(15.5);
    expect(created.filter).toEqual({
      kind: 'income',
      categoryUids: [],
      memberUids: [],
    });
    expect(created.outputKind).toBe('expense');
    expect(created.outputCategoryUid).toBe('cat-tax');
    expect(created.outputDescription).toBe('DARF');
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('rejeita percentual zero', async () => {
    const { saveFormula } = setup();

    expect(
      unwrapLeft(await saveFormula(formulaInput({ percent: 0 }))),
    ).toBeInstanceOf(InvalidPercentError);
  });

  it('rejeita percentual não numérico', async () => {
    const { saveFormula } = setup();

    expect(
      unwrapLeft(await saveFormula(formulaInput({ percent: Number.NaN }))),
    ).toBeInstanceOf(InvalidPercentError);
  });

  it('atualiza fórmula existente preservando uid e createdAt', async () => {
    const { saveFormula, listFormulas } = setup();
    const created = unwrap(await saveFormula(formulaInput()));

    const updated = unwrap(
      await saveFormula(
        formulaInput({
          uid: created.uid,
          name: 'DARF trimestral',
          percent: 20,
        }),
      ),
    );

    expect(updated.uid).toBe(created.uid);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    expect(updated.name).toBe('DARF trimestral');
    expect(updated.percent).toBe(20);
    expect(unwrap(await listFormulas())).toHaveLength(1);
  });

  it('rejeita atualização de fórmula inexistente', async () => {
    const { saveFormula } = setup();

    expect(
      unwrapLeft(await saveFormula(formulaInput({ uid: 'missing' }))),
    ).toBeInstanceOf(FinanceFormulaNotFoundError);
  });

  it('propaga falha ao gravar', async () => {
    const { automations, saveFormula } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await saveFormula(formulaInput()))).toBe(error);
  });

  it('propaga falha ao listar na atualização', async () => {
    const { automations, saveFormula } = setup();
    const created = unwrap(await saveFormula(formulaInput()));
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(
      unwrapLeft(await saveFormula(formulaInput({ uid: created.uid }))),
    ).toBe(error);
  });
});

describe('makeDeleteFormula', () => {
  it('exclui a fórmula sem apagar lançamentos gerados', async () => {
    const { entries, saveFormula, deleteFormula, listFormulas } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    await entries.create(
      makeStoredEntry({
        source: 'formula',
        sourceUid: formula.uid,
        formulaBaseMonth: '2026-06',
      }),
    );

    expect(isRight(await deleteFormula(formula.uid))).toBe(true);
    expect(unwrap(await listFormulas())).toEqual([]);
    expect(unwrap(await entries.list({}))).toHaveLength(1);
  });

  it('propaga falha de infraestrutura', async () => {
    const { automations, deleteFormula } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await deleteFormula('uid'))).toBe(error);
  });
});

describe('makePreviewFormula', () => {
  it('monta o preview com o filtro da fórmula', async () => {
    const { entries, closings, saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const match = unwrap(
      await entries.create(
        makeStoredEntry({
          month: '2026-07',
          kind: 'income',
          amount: 1000,
          status: 'paid',
        }),
      ),
    );
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'expense', amount: 300 }),
    );
    await entries.create(
      makeStoredEntry({ month: '2026-06', kind: 'income', amount: 900 }),
    );
    const previous = unwrap(
      await entries.create(
        makeStoredEntry({
          month: '2026-08',
          source: 'formula',
          sourceUid: formula.uid,
          formulaBaseMonth: '2026-07',
        }),
      ),
    );
    await entries.create(
      makeStoredEntry({
        month: '2026-07',
        source: 'formula',
        sourceUid: formula.uid,
        formulaBaseMonth: '2026-06',
      }),
    );
    await closings.create(makeClosing('2026-05'));

    const preview = unwrap(
      await previewFormula({ formulaUid: formula.uid, baseMonth: '2026-07' }),
    );

    expect(preview.matches.map((entry) => entry.uid)).toEqual([match.uid]);
    expect(preview.total).toBe(1000);
    expect(preview.generatedAmount).toBe(155);
    expect(preview.previousGenerations.map((entry) => entry.uid)).toEqual([
      previous.uid,
    ]);
    expect(preview.defaultTargetMonth).toBe('2026-08');
    expect(preview.closedMonths).toEqual(['2026-05']);
  });

  it('usa o filtro do input no lugar do filtro da fórmula', async () => {
    const { entries, saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const expense = unwrap(
      await entries.create(
        makeStoredEntry({ month: '2026-07', kind: 'expense', amount: 120 }),
      ),
    );
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 1000 }),
    );

    const preview = unwrap(
      await previewFormula({
        formulaUid: formula.uid,
        baseMonth: '2026-07',
        filter: {
          kind: 'expense',
          categoryUids: ['cat-market'],
          memberUids: [],
        },
      }),
    );

    expect(preview.matches.map((entry) => entry.uid)).toEqual([expense.uid]);
    expect(preview.generatedAmount).toBe(18.6);
  });

  it('retorna preview vazio quando nada casa', async () => {
    const { saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));

    const preview = unwrap(
      await previewFormula({ formulaUid: formula.uid, baseMonth: '2026-07' }),
    );

    expect(preview.matches).toEqual([]);
    expect(preview.total).toBe(0);
    expect(preview.generatedAmount).toBe(0);
    expect(preview.previousGenerations).toEqual([]);
  });

  it('rejeita fórmula inexistente', async () => {
    const { previewFormula } = setup();

    expect(
      unwrapLeft(
        await previewFormula({ formulaUid: 'missing', baseMonth: '2026-07' }),
      ),
    ).toBeInstanceOf(FinanceFormulaNotFoundError);
  });

  it('propaga falha ao listar fórmulas', async () => {
    const { automations, previewFormula } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(
      unwrapLeft(
        await previewFormula({ formulaUid: 'uid', baseMonth: '2026-07' }),
      ),
    ).toBe(error);
  });

  it('propaga falha ao listar lançamentos do mês-base', async () => {
    const { entries, saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(
      unwrapLeft(
        await previewFormula({ formulaUid: formula.uid, baseMonth: '2026-07' }),
      ),
    ).toBe(error);
  });

  it('propaga falha ao listar gerações anteriores', async () => {
    const { entries, saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const error = new ConnectorError('falha simulada');
    vi.spyOn(entries, 'list')
      .mockResolvedValueOnce(right([]))
      .mockResolvedValueOnce(left(error));

    expect(
      unwrapLeft(
        await previewFormula({ formulaUid: formula.uid, baseMonth: '2026-07' }),
      ),
    ).toBe(error);
  });

  it('propaga falha ao listar meses fechados', async () => {
    const { closings, saveFormula, previewFormula } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(
      unwrapLeft(
        await previewFormula({ formulaUid: formula.uid, baseMonth: '2026-07' }),
      ),
    ).toBe(error);
  });
});

describe('makeGenerateFormulaEntry', () => {
  const generateInput = (formulaUid: string) => ({
    formulaUid,
    baseMonth: '2026-07',
    filter: { kind: 'income' as const, categoryUids: [], memberUids: [] },
    targetMonth: '2026-08',
  });

  it('gera lançamento pendente no dia 1 do mês de destino', async () => {
    const { entries, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const first = unwrap(
      await entries.create(
        makeStoredEntry({ month: '2026-07', kind: 'income', amount: 1000 }),
      ),
    );
    const second = unwrap(
      await entries.create(
        makeStoredEntry({
          month: '2026-07',
          kind: 'income',
          amount: 234.56,
          memberUids: ['member-me', 'member-partner'],
          date: dateForMonthDay('2026-07', 20),
        }),
      ),
    );

    const generated = unwrap(
      await generateFormulaEntry(generateInput(formula.uid)),
    );

    expect(generated.description).toBe('DARF — 2026-07');
    expect(generated.amount).toBe(191.36);
    expect(generated.kind).toBe('expense');
    expect(generated.categoryUid).toBe('cat-tax');
    expect(generated.memberUids).toEqual(['member-me', 'member-partner']);
    expect(generated.date).toBe(dateForMonthDay('2026-08', 1));
    expect(generated.month).toBe('2026-08');
    expect(generated.status).toBe('pending');
    expect(generated.source).toBe('formula');
    expect(generated.sourceUid).toBe(formula.uid);
    expect(generated.installmentNumber).toBeNull();
    expect(generated.sourceEntryUids).toEqual([first.uid, second.uid]);
    expect(generated.formulaBaseMonth).toBe('2026-07');
    expect(generated.createdAt).toBe(generated.updatedAt);
  });

  it('rejeita quando o valor gerado arredonda para zero', async () => {
    const { entries, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput({ percent: 10 })));
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 0.01 }),
    );
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 0.01 }),
    );

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput(formula.uid))),
    ).toBeInstanceOf(InvalidFinanceAmountError);
    expect(unwrap(await entries.list({ month: '2026-08' }))).toEqual([]);
  });

  it('rejeita quando nenhum lançamento casa com o filtro', async () => {
    const { entries, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'expense' }),
    );

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput(formula.uid))),
    ).toBeInstanceOf(FormulaHasNoMatchesError);
  });

  it('rejeita mês de destino fechado', async () => {
    const { entries, closings, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 1000 }),
    );
    await closings.create(makeClosing('2026-08'));

    const error = unwrapLeft(
      await generateFormulaEntry(generateInput(formula.uid)),
    );

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-08');
    expect(unwrap(await entries.list({ month: '2026-08' }))).toEqual([]);
  });

  it('rejeita fórmula inexistente', async () => {
    const { generateFormulaEntry } = setup();

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput('missing'))),
    ).toBeInstanceOf(FinanceFormulaNotFoundError);
  });

  it('propaga falha ao listar lançamentos', async () => {
    const { entries, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput(formula.uid))),
    ).toBe(error);
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { entries, closings, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 1000 }),
    );
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput(formula.uid))),
    ).toBe(error);
  });

  it('propaga falha ao gravar', async () => {
    const { entries, saveFormula, generateFormulaEntry } = setup();
    const formula = unwrap(await saveFormula(formulaInput()));
    await entries.create(
      makeStoredEntry({ month: '2026-07', kind: 'income', amount: 1000 }),
    );
    const error = new ConnectorError('falha simulada');
    vi.spyOn(entries, 'create').mockResolvedValue(left(error));

    expect(
      unwrapLeft(await generateFormulaEntry(generateInput(formula.uid))),
    ).toBe(error);
  });
});

describe('makeListRecurrences', () => {
  it('lista as recorrências salvas', async () => {
    const { saveRecurrence, listRecurrences } = setup();
    const created = unwrap(await saveRecurrence(recurrenceInput()));

    const result = unwrap(await listRecurrences());

    expect(result.map((recurrence) => recurrence.uid)).toEqual([created.uid]);
  });

  it('propaga falha de infraestrutura', async () => {
    const { automations, listRecurrences } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await listRecurrences())).toBe(error);
  });
});

describe('makeSaveRecurrence', () => {
  it('cria recorrência com valor normalizado', async () => {
    const { saveRecurrence } = setup();

    const created = unwrap(
      await saveRecurrence(recurrenceInput({ amount: 89.991 })),
    );

    expect(created.uid).toBeTruthy();
    expect(created.description).toBe('Aluguel');
    expect(created.amount).toBe(89.99);
    expect(created.kind).toBe('expense');
    expect(created.categoryUid).toBe('cat-housing');
    expect(created.memberUids).toEqual(['member-me']);
    expect(created.dayOfMonth).toBe(5);
    expect(created.startMonth).toBe('2026-01');
    expect(created.endMonth).toBeNull();
    expect(created.active).toBe(true);
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('aceita startMonth igual ao endMonth', async () => {
    const { saveRecurrence } = setup();

    const created = unwrap(
      await saveRecurrence(
        recurrenceInput({ startMonth: '2026-03', endMonth: '2026-03' }),
      ),
    );

    expect(created.endMonth).toBe('2026-03');
  });

  it('rejeita valor menor ou igual a zero', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ amount: 0 }))),
    ).toBeInstanceOf(InvalidFinanceAmountError);
  });

  it('rejeita seleção vazia de membros', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ memberUids: [] }))),
    ).toBeInstanceOf(EmptyMemberSelectionError);
  });

  it('rejeita dayOfMonth menor que 1', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ dayOfMonth: 0 }))),
    ).toBeInstanceOf(InvalidRecurrenceRangeError);
  });

  it('rejeita dayOfMonth maior que 28', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ dayOfMonth: 29 }))),
    ).toBeInstanceOf(InvalidRecurrenceRangeError);
  });

  it('rejeita dayOfMonth não inteiro', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ dayOfMonth: 5.5 }))),
    ).toBeInstanceOf(InvalidRecurrenceRangeError);
  });

  it('rejeita startMonth inválido', async () => {
    const { saveRecurrence } = setup();

    const error = unwrapLeft(
      await saveRecurrence(recurrenceInput({ startMonth: '2026-13' })),
    );

    expect(error).toBeInstanceOf(InvalidMonthError);
    expect((error as InvalidMonthError).month).toBe('2026-13');
  });

  it('rejeita endMonth inválido', async () => {
    const { saveRecurrence } = setup();

    const error = unwrapLeft(
      await saveRecurrence(recurrenceInput({ endMonth: 'depois' })),
    );

    expect(error).toBeInstanceOf(InvalidMonthError);
    expect((error as InvalidMonthError).month).toBe('depois');
  });

  it('rejeita startMonth posterior ao endMonth', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(
        await saveRecurrence(
          recurrenceInput({ startMonth: '2026-05', endMonth: '2026-04' }),
        ),
      ),
    ).toBeInstanceOf(InvalidRecurrenceRangeError);
  });

  it('atualiza recorrência existente preservando uid e createdAt', async () => {
    const { saveRecurrence, listRecurrences } = setup();
    const created = unwrap(await saveRecurrence(recurrenceInput()));

    const updated = unwrap(
      await saveRecurrence(
        recurrenceInput({
          uid: created.uid,
          description: 'Aluguel reajustado',
          amount: 1800,
          active: false,
        }),
      ),
    );

    expect(updated.uid).toBe(created.uid);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);
    expect(updated.description).toBe('Aluguel reajustado');
    expect(updated.amount).toBe(1800);
    expect(updated.active).toBe(false);
    expect(unwrap(await listRecurrences())).toHaveLength(1);
  });

  it('rejeita atualização de recorrência inexistente', async () => {
    const { saveRecurrence } = setup();

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ uid: 'missing' }))),
    ).toBeInstanceOf(RecurrenceNotFoundError);
  });

  it('propaga falha ao gravar', async () => {
    const { automations, saveRecurrence } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await saveRecurrence(recurrenceInput()))).toBe(error);
  });

  it('propaga falha ao listar na atualização', async () => {
    const { automations, saveRecurrence } = setup();
    const created = unwrap(await saveRecurrence(recurrenceInput()));
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(
      unwrapLeft(await saveRecurrence(recurrenceInput({ uid: created.uid }))),
    ).toBe(error);
  });
});

describe('makeDeleteRecurrence', () => {
  it('exclui a recorrência sem apagar lançamentos gerados', async () => {
    const { entries, saveRecurrence, deleteRecurrence, listRecurrences } =
      setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    await entries.create(
      makeStoredEntry({ source: 'recurrence', sourceUid: recurrence.uid }),
    );

    expect(isRight(await deleteRecurrence(recurrence.uid))).toBe(true);
    expect(unwrap(await listRecurrences())).toEqual([]);
    expect(unwrap(await entries.list({}))).toHaveLength(1);
  });

  it('propaga falha de infraestrutura', async () => {
    const { automations, deleteRecurrence } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await deleteRecurrence('uid'))).toBe(error);
  });
});

describe('makeLaunchRecurrence', () => {
  it('lança a recorrência criando lançamento pendente no dia configurado', async () => {
    const { saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));

    const launched = unwrap(await launchRecurrence(recurrence.uid, '2026-07'));

    expect(launched.description).toBe('Aluguel');
    expect(launched.amount).toBe(1500);
    expect(launched.kind).toBe('expense');
    expect(launched.categoryUid).toBe('cat-housing');
    expect(launched.memberUids).toEqual(['member-me']);
    expect(launched.date).toBe(dateForMonthDay('2026-07', 5));
    expect(launched.month).toBe('2026-07');
    expect(launched.status).toBe('pending');
    expect(launched.source).toBe('recurrence');
    expect(launched.sourceUid).toBe(recurrence.uid);
    expect(launched.installmentNumber).toBeNull();
    expect(launched.sourceEntryUids).toEqual([]);
    expect(launched.formulaBaseMonth).toBeNull();
  });

  it('rejeita recorrência inexistente', async () => {
    const { launchRecurrence } = setup();

    expect(
      unwrapLeft(await launchRecurrence('missing', '2026-07')),
    ).toBeInstanceOf(RecurrenceNotFoundError);
  });

  it('rejeita mês anterior ao início', async () => {
    const { saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));

    expect(
      unwrapLeft(await launchRecurrence(recurrence.uid, '2025-12')),
    ).toBeInstanceOf(RecurrenceOutOfRangeError);
  });

  it('rejeita mês posterior ao fim', async () => {
    const { saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(
      await saveRecurrence(recurrenceInput({ endMonth: '2026-06' })),
    );

    expect(
      unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07')),
    ).toBeInstanceOf(RecurrenceOutOfRangeError);
  });

  it('rejeita recorrência inativa', async () => {
    const { saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(
      await saveRecurrence(recurrenceInput({ active: false })),
    );

    expect(
      unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07')),
    ).toBeInstanceOf(RecurrenceOutOfRangeError);
  });

  it('rejeita lançamento duplicado no mesmo mês', async () => {
    const { saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    unwrap(await launchRecurrence(recurrence.uid, '2026-07'));

    expect(
      unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07')),
    ).toBeInstanceOf(RecurrenceAlreadyLaunchedError);
  });

  it('rejeita mês fechado', async () => {
    const { closings, saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    await closings.create(makeClosing('2026-07'));

    const error = unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07'));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-07');
  });

  it('propaga falha ao listar recorrências', async () => {
    const { automations, launchRecurrence } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await launchRecurrence('uid', '2026-07'))).toBe(error);
  });

  it('propaga falha ao consultar lançamentos', async () => {
    const { entries, saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07'))).toBe(
      error,
    );
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { closings, saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07'))).toBe(
      error,
    );
  });

  it('propaga falha ao gravar', async () => {
    const { entries, saveRecurrence, launchRecurrence } = setup();
    const recurrence = unwrap(await saveRecurrence(recurrenceInput()));
    const error = new ConnectorError('falha simulada');
    vi.spyOn(entries, 'create').mockResolvedValue(left(error));

    expect(unwrapLeft(await launchRecurrence(recurrence.uid, '2026-07'))).toBe(
      error,
    );
  });
});

describe('makeLaunchAllRecurrences', () => {
  it('rejeita mês fechado sem lançar nada', async () => {
    const { entries, closings, saveRecurrence, launchAllRecurrences } = setup();
    await saveRecurrence(recurrenceInput());
    await closings.create(makeClosing('2026-07'));

    const error = unwrapLeft(await launchAllRecurrences('2026-07'));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('lança as elegíveis e pula as demais', async () => {
    const { entries, saveRecurrence, launchRecurrence, launchAllRecurrences } =
      setup();
    const eligible = unwrap(await saveRecurrence(recurrenceInput()));
    const launchedBefore = unwrap(
      await saveRecurrence(recurrenceInput({ description: 'Internet' })),
    );
    unwrap(await launchRecurrence(launchedBefore.uid, '2026-07'));
    await saveRecurrence(recurrenceInput({ active: false }));
    await saveRecurrence(recurrenceInput({ startMonth: '2026-09' }));

    const result = unwrap(await launchAllRecurrences('2026-07'));

    expect(result).toEqual({ launched: 1, skipped: 3 });
    expect(
      unwrap(
        await entries.list({
          source: 'recurrence',
          sourceUid: eligible.uid,
          month: '2026-07',
        }),
      ),
    ).toHaveLength(1);
    expect(unwrap(await entries.list({ month: '2026-07' }))).toHaveLength(2);
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { closings, launchAllRecurrences } = setup();
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await launchAllRecurrences('2026-07'))).toBe(error);
  });

  it('propaga falha ao listar recorrências', async () => {
    const { automations, launchAllRecurrences } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await launchAllRecurrences('2026-07'))).toBe(error);
  });

  it('propaga falha ao consultar lançamentos', async () => {
    const { entries, saveRecurrence, launchAllRecurrences } = setup();
    await saveRecurrence(recurrenceInput());
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await launchAllRecurrences('2026-07'))).toBe(error);
  });

  it('propaga falha ao gravar', async () => {
    const { entries, saveRecurrence, launchAllRecurrences } = setup();
    await saveRecurrence(recurrenceInput());
    const error = new ConnectorError('falha simulada');
    vi.spyOn(entries, 'create').mockResolvedValue(left(error));

    expect(unwrapLeft(await launchAllRecurrences('2026-07'))).toBe(error);
  });
});

describe('makeListPlans', () => {
  it('lista os planos salvos', async () => {
    const { createInstallmentPlan, listPlans } = setup();
    const created = unwrap(await createInstallmentPlan(planInput()));

    const result = unwrap(await listPlans());

    expect(result.map((plan) => plan.uid)).toEqual([created.uid]);
  });

  it('propaga falha de infraestrutura', async () => {
    const { automations, listPlans } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await listPlans())).toBe(error);
  });
});

describe('makePreviewInstallments', () => {
  it('monta a prévia com meses consecutivos', () => {
    const { previewInstallments } = setup();

    const result = unwrap(previewInstallments(100, 3, '2026-11'));

    expect(result).toEqual([
      { month: '2026-11', amount: 33.33 },
      { month: '2026-12', amount: 33.33 },
      { month: '2027-01', amount: 33.34 },
    ]);
  });

  it('normaliza o total antes de montar a prévia', () => {
    const { previewInstallments } = setup();

    const result = unwrap(previewInstallments(10.999, 2, '2026-07'));

    expect(result).toEqual([
      { month: '2026-07', amount: 5.5 },
      { month: '2026-08', amount: 5.5 },
    ]);
  });

  it('rejeita total inválido', () => {
    const { previewInstallments } = setup();

    expect(unwrapLeft(previewInstallments(0, 3, '2026-07'))).toBeInstanceOf(
      InvalidFinanceAmountError,
    );
  });

  it('propaga parcelas inválidas', () => {
    const { previewInstallments } = setup();

    expect(unwrapLeft(previewInstallments(0.05, 10, '2026-07'))).toBeInstanceOf(
      InvalidInstallmentCountError,
    );
  });
});

describe('makeCreateInstallmentPlan', () => {
  it('cria o plano e as parcelas em meses consecutivos', async () => {
    const { entries, createInstallmentPlan, listPlans } = setup();
    const input = planInput();

    const plan = unwrap(await createInstallmentPlan(input));

    expect(plan.uid).toBe(input.uid);
    expect(unwrap(await listPlans())).toHaveLength(1);
    const created = unwrap(
      await entries.list({ source: 'installment', sourceUid: plan.uid }),
    );
    expect(created).toHaveLength(3);
    expect(created.map((entry) => entry.description)).toEqual([
      'Notebook (1/3)',
      'Notebook (2/3)',
      'Notebook (3/3)',
    ]);
    expect(created.map((entry) => entry.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(created.map((entry) => entry.amount)).toEqual([33.34, 33.34, 33.34]);
    expect(created.map((entry) => entry.installmentNumber)).toEqual([1, 2, 3]);
    expect(created.every((entry) => entry.status === 'pending')).toBe(true);
    expect(created[0].date).toBe(dateForMonthDay('2026-07', 10));
    expect(created[0].kind).toBe('expense');
    expect(created[0].categoryUid).toBe('cat-shopping');
    expect(created[0].memberUids).toEqual(['member-me']);
    expect(created[0].sourceEntryUids).toEqual([]);
    expect(created[0].formulaBaseMonth).toBeNull();
  });

  it('normaliza o total e persiste o valor arredondado no plano', async () => {
    const { entries, createInstallmentPlan, listPlans } = setup();

    const plan = unwrap(
      await createInstallmentPlan(
        planInput({ totalAmount: 10.999, installmentCount: 2 }),
      ),
    );

    expect(plan.totalAmount).toBe(11);
    expect(unwrap(await listPlans())[0].totalAmount).toBe(11);
    const created = unwrap(
      await entries.list({ source: 'installment', sourceUid: plan.uid }),
    );
    expect(created.map((entry) => entry.amount)).toEqual([5.5, 5.5]);
    expect(created.reduce((sum, entry) => sum + entry.amount, 0)).toBe(
      plan.totalAmount,
    );
  });

  it('rejeita total inválido', async () => {
    const { createInstallmentPlan, listPlans } = setup();

    expect(
      unwrapLeft(await createInstallmentPlan(planInput({ totalAmount: 0 }))),
    ).toBeInstanceOf(InvalidFinanceAmountError);
    expect(unwrap(await listPlans())).toEqual([]);
  });

  it('rejeita parcelas que zeram a última', async () => {
    const { createInstallmentPlan, listPlans } = setup();

    expect(
      unwrapLeft(
        await createInstallmentPlan(
          planInput({ totalAmount: 0.05, installmentCount: 10 }),
        ),
      ),
    ).toBeInstanceOf(InvalidInstallmentCountError);
    expect(unwrap(await listPlans())).toEqual([]);
  });

  it('rejeita seleção vazia de membros', async () => {
    const { createInstallmentPlan } = setup();

    expect(
      unwrapLeft(await createInstallmentPlan(planInput({ memberUids: [] }))),
    ).toBeInstanceOf(EmptyMemberSelectionError);
  });

  it('rejeita dayOfMonth fora de 1..28', async () => {
    const { createInstallmentPlan } = setup();

    expect(
      unwrapLeft(await createInstallmentPlan(planInput({ dayOfMonth: 29 }))),
    ).toBeInstanceOf(InvalidRecurrenceRangeError);
  });

  it('rejeita firstMonth inválido', async () => {
    const { createInstallmentPlan } = setup();

    const error = unwrapLeft(
      await createInstallmentPlan(planInput({ firstMonth: '2026-7' })),
    );

    expect(error).toBeInstanceOf(InvalidMonthError);
    expect((error as InvalidMonthError).month).toBe('2026-7');
  });

  it('rejeita o plano inteiro quando qualquer parcela cai em mês fechado', async () => {
    const { entries, closings, createInstallmentPlan, listPlans } = setup();
    await closings.create(makeClosing('2026-09'));

    const error = unwrapLeft(await createInstallmentPlan(planInput()));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-09');
    expect(unwrap(await listPlans())).toEqual([]);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('faz rollback do plano quando a gravação das parcelas falha', async () => {
    const { entries, createInstallmentPlan, listPlans } = setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await createInstallmentPlan(planInput()))).toBe(error);
    expect(unwrap(await listPlans())).toEqual([]);
  });

  it('propaga falha ao consultar meses fechados', async () => {
    const { closings, createInstallmentPlan, listPlans } = setup();
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await createInstallmentPlan(planInput()))).toBe(error);
    expect(unwrap(await listPlans())).toEqual([]);
  });

  it('propaga falha ao criar o plano', async () => {
    const { entries, automations, createInstallmentPlan } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await createInstallmentPlan(planInput()))).toBe(error);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });
});

describe('makeDeleteInstallmentPlan', () => {
  it('exclui o plano e as parcelas pendentes de meses abertos', async () => {
    const {
      entries,
      closings,
      createInstallmentPlan,
      deleteInstallmentPlan,
      listPlans,
    } = setup();
    const plan = unwrap(await createInstallmentPlan(planInput()));
    await closings.create(makeClosing('2026-08'));
    const paidInstallment = unwrap(await entries.list({ month: '2026-09' }))[0];
    await entries.update(paidInstallment.uid, { status: 'paid' });

    expect(isRight(await deleteInstallmentPlan(plan.uid))).toBe(true);

    expect(unwrap(await listPlans())).toEqual([]);
    const remaining = unwrap(await entries.list({}));
    expect(remaining.map((entry) => entry.month)).toEqual([
      '2026-08',
      '2026-09',
    ]);
    expect(remaining[0].status).toBe('pending');
    expect(remaining[1].status).toBe('paid');
    expect(remaining.every((entry) => entry.sourceUid === plan.uid)).toBe(true);
  });

  it('rejeita plano inexistente', async () => {
    const { deleteInstallmentPlan } = setup();

    expect(unwrapLeft(await deleteInstallmentPlan('missing'))).toBeInstanceOf(
      InstallmentPlanNotFoundError,
    );
  });

  it('propaga falha ao listar planos', async () => {
    const { automations, deleteInstallmentPlan } = setup();
    const error = new ConnectorError('falha simulada');
    automations.failNext(error);

    expect(unwrapLeft(await deleteInstallmentPlan('uid'))).toBe(error);
  });

  it('propaga falha ao consultar meses fechados', async () => {
    const { closings, createInstallmentPlan, deleteInstallmentPlan } = setup();
    const plan = unwrap(await createInstallmentPlan(planInput()));
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await deleteInstallmentPlan(plan.uid))).toBe(error);
  });

  it('propaga falha ao excluir as parcelas', async () => {
    const { entries, createInstallmentPlan, deleteInstallmentPlan } = setup();
    const plan = unwrap(await createInstallmentPlan(planInput()));
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await deleteInstallmentPlan(plan.uid))).toBe(error);
    expect(unwrap(await entries.list({}))).toHaveLength(3);
  });

  it('faz rollback das parcelas quando a exclusão do plano falha', async () => {
    const {
      entries,
      automations,
      createInstallmentPlan,
      deleteInstallmentPlan,
    } = setup();
    const plan = unwrap(await createInstallmentPlan(planInput()));
    const error = new ConnectorError('falha simulada');
    vi.spyOn(automations, 'deletePlan').mockResolvedValue(left(error));

    expect(unwrapLeft(await deleteInstallmentPlan(plan.uid))).toBe(error);
    expect(unwrap(await entries.list({}))).toHaveLength(3);
  });
});
