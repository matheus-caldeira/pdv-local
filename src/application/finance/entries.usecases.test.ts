import { describe, expect, it } from 'vitest';
import { isLeft, isRight, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  DerivedEntryDateLockedError,
  EmptyMemberSelectionError,
  FinanceCategoryNotFoundError,
  FinanceEntryNotFoundError,
  InvalidFinanceAmountError,
  MonthClosedError,
} from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  MonthKey,
  NewFinanceEntry,
  NewMonthClosing,
} from '../../domain/finance/finance.entity';
import { dateForMonthDay } from '../../domain/finance/finance.rules';
import {
  FakeFinanceCategoryRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
} from './fakes';
import {
  makeCreateEntry,
  makeDeleteEntry,
  makeListEntries,
  makeListOverdueEntries,
  makeSetEntryStatus,
  makeUpdateEntry,
  type EntryInput,
} from './entries.usecases';

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
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
};

const setup = async () => {
  const entries = new FakeFinanceEntryRepository();
  const categories = new FakeFinanceCategoryRepository();
  const closings = new FakeFinanceClosingRepository();
  const expenseCategory = unwrap(
    await categories.create({ name: 'Mercado', kind: 'expense' }),
  );
  const incomeCategory = unwrap(
    await categories.create({ name: 'Salário', kind: 'income' }),
  );
  const input = (overrides: Partial<EntryInput> = {}): EntryInput => ({
    description: 'Mercado da semana',
    amount: 120,
    categoryUid: expenseCategory.uid,
    memberUids: ['member-me'],
    date: dateForMonthDay('2026-07', 10),
    status: 'pending',
    ...overrides,
  });
  return {
    entries,
    categories,
    closings,
    expenseCategory,
    incomeCategory,
    input,
    listEntries: makeListEntries(entries),
    listOverdueEntries: makeListOverdueEntries(entries, closings),
    createEntry: makeCreateEntry(entries, categories, closings),
    updateEntry: makeUpdateEntry(entries, closings),
    deleteEntry: makeDeleteEntry(entries, closings),
    setEntryStatus: makeSetEntryStatus(entries),
  };
};

describe('makeListEntries', () => {
  it('repassa o filtro ao repositório', async () => {
    const { entries, listEntries } = await setup();
    await entries.create(makeStoredEntry({ month: '2026-07' }));
    await entries.create(makeStoredEntry({ month: '2026-08' }));

    const result = unwrap(await listEntries({ month: '2026-07' }));

    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2026-07');
  });

  it('propaga falha de infraestrutura', async () => {
    const { entries, listEntries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await listEntries({}))).toBe(error);
  });
});

describe('makeListOverdueEntries', () => {
  it('retorna pendentes de meses anteriores, fechados ou não', async () => {
    const { entries, closings, listOverdueEntries } = await setup();
    await closings.create(makeClosing('2026-05'));
    const closedMonthPending = unwrap(
      await entries.create(makeStoredEntry({ month: '2026-05' })),
    );
    const openMonthPending = unwrap(
      await entries.create(makeStoredEntry({ month: '2026-06' })),
    );
    await entries.create(makeStoredEntry({ month: '2026-06', status: 'paid' }));
    await entries.create(makeStoredEntry({ month: '2026-07' }));

    const result = unwrap(
      await listOverdueEntries(dateForMonthDay('2026-07', 15)),
    );

    expect(result.map((entry) => entry.uid)).toEqual([
      closedMonthPending.uid,
      openMonthPending.uid,
    ]);
  });

  it('propaga falha ao consultar fechamentos', async () => {
    const { closings, listOverdueEntries } = await setup();
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(
      unwrapLeft(await listOverdueEntries(dateForMonthDay('2026-07', 15))),
    ).toBe(error);
  });

  it('propaga falha ao listar lançamentos', async () => {
    const { entries, listOverdueEntries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(
      unwrapLeft(await listOverdueEntries(dateForMonthDay('2026-07', 15))),
    ).toBe(error);
  });
});

describe('makeCreateEntry', () => {
  it('cria lançamento manual com kind copiado da categoria e month derivado da data', async () => {
    const { createEntry, input, expenseCategory } = await setup();

    const created = unwrap(
      await createEntry(
        input({ description: '  Mercado da semana  ', amount: 120.556 }),
      ),
    );

    expect(created.uid).toBeTruthy();
    expect(created.description).toBe('Mercado da semana');
    expect(created.amount).toBe(120.56);
    expect(created.kind).toBe('expense');
    expect(created.categoryUid).toBe(expenseCategory.uid);
    expect(created.month).toBe('2026-07');
    expect(created.status).toBe('pending');
    expect(created.source).toBe('manual');
    expect(created.sourceUid).toBeNull();
    expect(created.installmentNumber).toBeNull();
    expect(created.sourceEntryUids).toEqual([]);
    expect(created.formulaBaseMonth).toBeNull();
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('copia o kind de categoria de receita', async () => {
    const { createEntry, input, incomeCategory } = await setup();

    const created = unwrap(
      await createEntry(input({ categoryUid: incomeCategory.uid })),
    );

    expect(created.kind).toBe('income');
  });

  it('rejeita valor menor ou igual a zero', async () => {
    const { createEntry, input } = await setup();

    expect(unwrapLeft(await createEntry(input({ amount: 0 })))).toBeInstanceOf(
      InvalidFinanceAmountError,
    );
  });

  it('rejeita seleção vazia de membros', async () => {
    const { createEntry, input } = await setup();

    expect(
      unwrapLeft(await createEntry(input({ memberUids: [] }))),
    ).toBeInstanceOf(EmptyMemberSelectionError);
  });

  it('rejeita categoria inexistente', async () => {
    const { createEntry, input } = await setup();

    expect(
      unwrapLeft(await createEntry(input({ categoryUid: 'cat-missing' }))),
    ).toBeInstanceOf(FinanceCategoryNotFoundError);
  });

  it('rejeita mês fechado', async () => {
    const { createEntry, input, closings } = await setup();
    await closings.create(makeClosing('2026-07'));

    const error = unwrapLeft(await createEntry(input()));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-07');
  });

  it('propaga falha ao listar categorias', async () => {
    const { createEntry, input, categories } = await setup();
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(unwrapLeft(await createEntry(input()))).toBe(error);
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { createEntry, input, closings } = await setup();
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await createEntry(input()))).toBe(error);
  });

  it('propaga falha ao gravar', async () => {
    const { createEntry, input, entries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await createEntry(input()))).toBe(error);
  });
});

describe('makeUpdateEntry', () => {
  it('atualiza recomputando o month a partir da data', async () => {
    const { createEntry, updateEntry, input } = await setup();
    const created = unwrap(await createEntry(input()));

    const updated = unwrap(
      await updateEntry(
        created.uid,
        input({
          description: '  Feira do mês  ',
          amount: 89.991,
          date: dateForMonthDay('2026-08', 5),
          status: 'paid',
        }),
      ),
    );

    expect(updated.description).toBe('Feira do mês');
    expect(updated.amount).toBe(89.99);
    expect(updated.date).toBe(dateForMonthDay('2026-08', 5));
    expect(updated.month).toBe('2026-08');
    expect(updated.status).toBe('paid');
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('mantém o kind original ao trocar de categoria', async () => {
    const { createEntry, updateEntry, input, incomeCategory } = await setup();
    const created = unwrap(await createEntry(input()));

    const updated = unwrap(
      await updateEntry(
        created.uid,
        input({ categoryUid: incomeCategory.uid }),
      ),
    );

    expect(updated.categoryUid).toBe(incomeCategory.uid);
    expect(updated.kind).toBe('expense');
  });

  it('rejeita alteração de data em lançamento derivado', async () => {
    const { entries, updateEntry, input } = await setup();
    const derived = unwrap(
      await entries.create(
        makeStoredEntry({ source: 'recurrence', sourceUid: 'rec-1' }),
      ),
    );

    const error = unwrapLeft(
      await updateEntry(
        derived.uid,
        input({ date: dateForMonthDay('2026-08', 10) }),
      ),
    );

    expect(error).toBeInstanceOf(DerivedEntryDateLockedError);
  });

  it('permite editar lançamento derivado mantendo a data', async () => {
    const { entries, updateEntry, input } = await setup();
    const derived = unwrap(
      await entries.create(
        makeStoredEntry({ source: 'installment', sourceUid: 'plan-1' }),
      ),
    );

    const updated = unwrap(
      await updateEntry(
        derived.uid,
        input({ description: 'Parcela ajustada', date: derived.date }),
      ),
    );

    expect(updated.description).toBe('Parcela ajustada');
    expect(updated.month).toBe(derived.month);
  });

  it('rejeita lançamento inexistente', async () => {
    const { updateEntry, input } = await setup();

    expect(unwrapLeft(await updateEntry('missing', input()))).toBeInstanceOf(
      FinanceEntryNotFoundError,
    );
  });

  it('rejeita edição quando o mês armazenado está fechado', async () => {
    const { createEntry, updateEntry, input, closings } = await setup();
    const created = unwrap(await createEntry(input()));
    await closings.create(makeClosing('2026-07'));

    const error = unwrapLeft(await updateEntry(created.uid, input()));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-07');
  });

  it('rejeita mover lançamento para mês fechado', async () => {
    const { createEntry, updateEntry, input, closings } = await setup();
    const created = unwrap(await createEntry(input()));
    await closings.create(makeClosing('2026-08'));

    const error = unwrapLeft(
      await updateEntry(
        created.uid,
        input({ date: dateForMonthDay('2026-08', 10) }),
      ),
    );

    expect(error).toBeInstanceOf(MonthClosedError);
    expect((error as MonthClosedError).month).toBe('2026-08');
  });

  it('rejeita valor inválido', async () => {
    const { createEntry, updateEntry, input } = await setup();
    const created = unwrap(await createEntry(input()));

    expect(
      unwrapLeft(await updateEntry(created.uid, input({ amount: -10 }))),
    ).toBeInstanceOf(InvalidFinanceAmountError);
  });

  it('rejeita seleção vazia de membros', async () => {
    const { createEntry, updateEntry, input } = await setup();
    const created = unwrap(await createEntry(input()));

    expect(
      unwrapLeft(await updateEntry(created.uid, input({ memberUids: [] }))),
    ).toBeInstanceOf(EmptyMemberSelectionError);
  });

  it('propaga falha ao buscar o lançamento', async () => {
    const { updateEntry, input, entries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await updateEntry('uid', input()))).toBe(error);
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { createEntry, updateEntry, input, closings } = await setup();
    const created = unwrap(await createEntry(input()));
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await updateEntry(created.uid, input()))).toBe(error);
  });
});

describe('makeDeleteEntry', () => {
  it('exclui lançamento de mês aberto', async () => {
    const { createEntry, deleteEntry, input, entries } = await setup();
    const created = unwrap(await createEntry(input()));

    expect(isRight(await deleteEntry(created.uid))).toBe(true);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('rejeita lançamento inexistente', async () => {
    const { deleteEntry } = await setup();

    expect(unwrapLeft(await deleteEntry('missing'))).toBeInstanceOf(
      FinanceEntryNotFoundError,
    );
  });

  it('rejeita exclusão em mês fechado', async () => {
    const { createEntry, deleteEntry, input, closings, entries } =
      await setup();
    const created = unwrap(await createEntry(input()));
    await closings.create(makeClosing('2026-07'));

    const error = unwrapLeft(await deleteEntry(created.uid));

    expect(error).toBeInstanceOf(MonthClosedError);
    expect(unwrap(await entries.list({}))).toHaveLength(1);
  });

  it('propaga falha ao buscar o lançamento', async () => {
    const { deleteEntry, entries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await deleteEntry('uid'))).toBe(error);
  });

  it('propaga falha ao consultar fechamento', async () => {
    const { createEntry, deleteEntry, input, closings } = await setup();
    const created = unwrap(await createEntry(input()));
    const error = new ConnectorError('falha simulada');
    closings.failNext(error);

    expect(unwrapLeft(await deleteEntry(created.uid))).toBe(error);
  });
});

describe('makeSetEntryStatus', () => {
  it('paga lançamento de mês fechado alterando apenas status e updatedAt', async () => {
    const { entries, closings, setEntryStatus } = await setup();
    await closings.create(makeClosing('2026-05'));
    const stored = unwrap(
      await entries.create(makeStoredEntry({ month: '2026-05' })),
    );

    const updated = unwrap(await setEntryStatus(stored.uid, 'paid'));

    expect(updated.status).toBe('paid');
    expect(updated.updatedAt).toBeGreaterThan(stored.updatedAt);
    expect(updated.description).toBe(stored.description);
    expect(updated.amount).toBe(stored.amount);
    expect(updated.date).toBe(stored.date);
    expect(updated.month).toBe(stored.month);
    expect(updated.createdAt).toBe(stored.createdAt);
  });

  it('despaga lançamento pago', async () => {
    const { entries, setEntryStatus } = await setup();
    const stored = unwrap(
      await entries.create(makeStoredEntry({ status: 'paid' })),
    );

    const updated = unwrap(await setEntryStatus(stored.uid, 'pending'));

    expect(updated.status).toBe('pending');
  });

  it('rejeita lançamento inexistente', async () => {
    const { setEntryStatus } = await setup();

    expect(unwrapLeft(await setEntryStatus('missing', 'paid'))).toBeInstanceOf(
      FinanceEntryNotFoundError,
    );
  });

  it('propaga falha de infraestrutura', async () => {
    const { setEntryStatus, entries } = await setup();
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await setEntryStatus('uid', 'paid'))).toBe(error);
  });
});
