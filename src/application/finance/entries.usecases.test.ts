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
  PaymentMethodNotFoundError,
} from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  MonthKey,
  NewFinanceEntry,
  NewMonthClosing,
} from '../../domain/finance/finance.entity';
import { dateForMonthDay } from '../../domain/finance/finance.rules';
import type {
  NewCardInvoice,
  NewPaymentMethod,
} from '../../domain/finance/payment-method.entity';
import {
  FakeCardInvoiceRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
  FakePaymentMethodRepository,
  makeFakeUnitOfWork,
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
import { INVOICE_ADJUSTMENT_CATEGORY_NAME } from './invoices.usecases';

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

const makeCard = (
  overrides: Partial<NewPaymentMethod> = {},
): NewPaymentMethod => ({
  uid: 'card-credit',
  name: 'Cartão de crédito',
  type: 'credit',
  closingDay: 20,
  dueDay: 5,
  archived: false,
  createdAt: 1,
  ...overrides,
});

const INVOICE_MONTH: MonthKey = '2026-08';

const makeInvoice = (
  overrides: Partial<NewCardInvoice> = {},
): NewCardInvoice => ({
  uid: createUid(),
  paymentMethodUid: 'card-credit',
  month: INVOICE_MONTH,
  dueDate: dateForMonthDay(INVOICE_MONTH, 5),
  statedAmount: null,
  status: 'open',
  paidAt: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const setup = async () => {
  const entries = new FakeFinanceEntryRepository();
  const categories = new FakeFinanceCategoryRepository();
  const closings = new FakeFinanceClosingRepository();
  const methods = new FakePaymentMethodRepository();
  const invoices = new FakeCardInvoiceRepository();
  const uow = makeFakeUnitOfWork({
    financeEntries: entries,
    financeCategories: categories,
    financeClosings: closings,
    financePaymentMethods: methods,
    financeCardInvoices: invoices,
  });
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
    paymentMethodUid: null,
    ...overrides,
  });
  return {
    entries,
    categories,
    closings,
    methods,
    invoices,
    uow,
    expenseCategory,
    incomeCategory,
    input,
    listEntries: makeListEntries(entries),
    listOverdueEntries: makeListOverdueEntries(entries),
    createEntry: makeCreateEntry(uow, categories, closings),
    updateEntry: makeUpdateEntry(uow, categories, closings),
    deleteEntry: makeDeleteEntry(uow, categories, closings),
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

  it('sem meio de pagamento mantém os campos de fatura nulos', async () => {
    const { createEntry, input } = await setup();

    const created = unwrap(await createEntry(input()));

    expect(created.paymentMethodUid).toBeNull();
    expect(created.invoiceMonth).toBeNull();
    expect(created.invoiceUid).toBeNull();
  });

  it('resolve o invoiceMonth ao usar cartão de crédito', async () => {
    const { createEntry, input, methods } = await setup();
    const card = unwrap(await methods.create(makeCard()));

    const created = unwrap(
      await createEntry(input({ paymentMethodUid: card.uid })),
    );

    expect(created.paymentMethodUid).toBe(card.uid);
    expect(created.invoiceMonth).toBe('2026-08');
    expect(created.invoiceUid).toBeNull();
  });

  it('vincula ao invoiceUid quando a fatura já existe', async () => {
    const { createEntry, input, methods, invoices } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    const invoice = unwrap(
      await invoices.create({
        uid: createUid(),
        paymentMethodUid: card.uid,
        month: '2026-08',
        dueDate: dateForMonthDay('2026-08', 5),
        statedAmount: null,
        status: 'open',
        paidAt: null,
        createdAt: 1,
        updatedAt: 1,
      }),
    );

    const created = unwrap(
      await createEntry(input({ paymentMethodUid: card.uid })),
    );

    expect(created.invoiceMonth).toBe('2026-08');
    expect(created.invoiceUid).toBe(invoice.uid);
  });

  it('meio não-crédito mantém invoiceMonth nulo', async () => {
    const { createEntry, input, methods } = await setup();
    const debit = unwrap(
      await methods.create(
        makeCard({
          uid: 'card-debit',
          name: 'Débito',
          type: 'debit',
          closingDay: null,
          dueDay: null,
        }),
      ),
    );

    const created = unwrap(
      await createEntry(input({ paymentMethodUid: debit.uid })),
    );

    expect(created.paymentMethodUid).toBe(debit.uid);
    expect(created.invoiceMonth).toBeNull();
    expect(created.invoiceUid).toBeNull();
  });

  it('rejeita meio de pagamento inexistente', async () => {
    const { createEntry, input } = await setup();

    expect(
      unwrapLeft(
        await createEntry(input({ paymentMethodUid: 'card-missing' })),
      ),
    ).toBeInstanceOf(PaymentMethodNotFoundError);
  });

  it('propaga falha ao buscar o meio de pagamento', async () => {
    const { createEntry, input, methods } = await setup();
    const error = new ConnectorError('falha simulada');
    methods.failNext(error);

    expect(
      unwrapLeft(await createEntry(input({ paymentMethodUid: 'card-x' }))),
    ).toBe(error);
  });

  it('propaga falha ao buscar a fatura', async () => {
    const { createEntry, input, methods, invoices } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    const error = new ConnectorError('falha simulada');
    invoices.failNext(error);

    expect(
      unwrapLeft(await createEntry(input({ paymentMethodUid: card.uid }))),
    ).toBe(error);
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

  it('resolve os campos de fatura ao vincular um cartão de crédito', async () => {
    const { createEntry, updateEntry, input, methods } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    const created = unwrap(await createEntry(input()));

    const updated = unwrap(
      await updateEntry(created.uid, input({ paymentMethodUid: card.uid })),
    );

    expect(updated.paymentMethodUid).toBe(card.uid);
    expect(updated.invoiceMonth).toBe('2026-08');
    expect(updated.invoiceUid).toBeNull();
  });

  it('rejeita meio de pagamento inexistente ao vincular na atualização', async () => {
    const { createEntry, updateEntry, input } = await setup();
    const created = unwrap(await createEntry(input()));

    expect(
      unwrapLeft(
        await updateEntry(
          created.uid,
          input({ paymentMethodUid: 'card-missing' }),
        ),
      ),
    ).toBeInstanceOf(PaymentMethodNotFoundError);
  });

  it('recomputa o kind a partir da nova categoria', async () => {
    const { createEntry, updateEntry, input, incomeCategory } = await setup();
    const created = unwrap(await createEntry(input()));

    const updated = unwrap(
      await updateEntry(
        created.uid,
        input({ categoryUid: incomeCategory.uid }),
      ),
    );

    expect(updated.categoryUid).toBe(incomeCategory.uid);
    expect(updated.kind).toBe('income');
  });

  it('rejeita categoria inexistente', async () => {
    const { createEntry, updateEntry, input } = await setup();
    const created = unwrap(await createEntry(input()));

    expect(
      unwrapLeft(
        await updateEntry(created.uid, input({ categoryUid: 'cat-missing' })),
      ),
    ).toBeInstanceOf(FinanceCategoryNotFoundError);
  });

  it('propaga falha ao listar categorias', async () => {
    const { createEntry, updateEntry, input, categories } = await setup();
    const created = unwrap(await createEntry(input()));
    const error = new ConnectorError('falha simulada');
    categories.failNext(error);

    expect(unwrapLeft(await updateEntry(created.uid, input()))).toBe(error);
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

describe('recálculo automático do ajuste da fatura', () => {
  const listAdjustments = (entries: FakeFinanceEntryRepository) =>
    entries.list({ source: 'invoice-adjustment' });

  it('encolhe o ajuste ao criar um lançamento na fatura aberta', async () => {
    const { createEntry, input, methods, invoices, categories, entries } =
      await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    await categories.create({
      name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
      kind: 'expense',
    });
    await entries.create(
      makeStoredEntry({
        month: INVOICE_MONTH,
        amount: 400,
        paymentMethodUid: card.uid,
        invoiceMonth: INVOICE_MONTH,
        source: 'invoice-adjustment',
        sourceUid: 'inv',
        invoiceUid: 'inv',
      }),
    );

    unwrap(
      await createEntry(input({ amount: 300, paymentMethodUid: card.uid })),
    );

    const adjustments = unwrap(await listAdjustments(entries));
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(700);
  });

  it('não recalcula o ajuste quando o mês de vencimento está fechado', async () => {
    const {
      createEntry,
      input,
      methods,
      invoices,
      categories,
      closings,
      entries,
    } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    await categories.create({
      name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
      kind: 'expense',
    });
    await entries.create(
      makeStoredEntry({
        month: INVOICE_MONTH,
        amount: 400,
        paymentMethodUid: card.uid,
        invoiceMonth: INVOICE_MONTH,
        source: 'invoice-adjustment',
        sourceUid: 'inv',
        invoiceUid: 'inv',
      }),
    );
    await closings.create(makeClosing(INVOICE_MONTH));

    unwrap(
      await createEntry(input({ amount: 300, paymentMethodUid: card.uid })),
    );

    const adjustments = unwrap(await listAdjustments(entries));
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(400);
  });

  it('cria o ajuste ao criar o primeiro lançamento da fatura', async () => {
    const { createEntry, input, methods, invoices, entries } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));

    unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );

    const adjustments = unwrap(await listAdjustments(entries));
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(600);
  });

  it('aumenta o ajuste ao excluir um lançamento detalhado', async () => {
    const { createEntry, deleteEntry, input, methods, invoices, entries } =
      await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    const created = unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );
    expect(unwrap(await listAdjustments(entries))[0].amount).toBe(600);

    unwrap(await deleteEntry(created.uid));

    const adjustments = unwrap(await listAdjustments(entries));
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(1000);
  });

  it('recalcula o ajuste ao editar o valor de um lançamento da fatura', async () => {
    const { createEntry, updateEntry, input, methods, invoices, entries } =
      await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    const created = unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );

    unwrap(
      await updateEntry(
        created.uid,
        input({ amount: 250, paymentMethodUid: card.uid }),
      ),
    );

    const adjustments = unwrap(await listAdjustments(entries));
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(750);
  });

  it('recalcula as duas faturas ao mover o lançamento entre cartões', async () => {
    const { createEntry, updateEntry, input, methods, invoices, entries } =
      await setup();
    const source = unwrap(await methods.create(makeCard()));
    const target = unwrap(
      await methods.create(makeCard({ uid: 'card-target', name: 'Outro' })),
    );
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    await invoices.create(
      makeInvoice({ paymentMethodUid: target.uid, statedAmount: 1000 }),
    );
    const created = unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: source.uid })),
    );
    expect(
      unwrap(
        await entries.list({
          source: 'invoice-adjustment',
          paymentMethodUid: source.uid,
        }),
      )[0].amount,
    ).toBe(600);

    unwrap(
      await updateEntry(
        created.uid,
        input({ amount: 400, paymentMethodUid: target.uid }),
      ),
    );

    const sourceAdjustments = unwrap(
      await entries.list({
        source: 'invoice-adjustment',
        paymentMethodUid: source.uid,
      }),
    );
    expect(sourceAdjustments).toHaveLength(1);
    expect(sourceAdjustments[0].amount).toBe(1000);
    const targetAdjustments = unwrap(
      await entries.list({
        source: 'invoice-adjustment',
        paymentMethodUid: target.uid,
      }),
    );
    expect(targetAdjustments).toHaveLength(1);
    expect(targetAdjustments[0].amount).toBe(600);
  });

  it('remove o ajuste sem erro quando o detalhado excede o valor informado', async () => {
    const { createEntry, input, methods, invoices, categories, entries } =
      await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    await categories.create({
      name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
      kind: 'expense',
    });
    await entries.create(
      makeStoredEntry({
        month: INVOICE_MONTH,
        amount: 200,
        paymentMethodUid: card.uid,
        invoiceMonth: INVOICE_MONTH,
        source: 'invoice-adjustment',
        sourceUid: 'inv',
        invoiceUid: 'inv',
      }),
    );

    const created = unwrap(
      await createEntry(input({ amount: 1200, paymentMethodUid: card.uid })),
    );

    expect(created.amount).toBe(1200);
    expect(unwrap(await listAdjustments(entries))).toEqual([]);
  });

  it('não mexe no ajuste congelado de uma fatura paga', async () => {
    const { createEntry, input, methods, invoices, entries } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(
      makeInvoice({ status: 'paid', paidAt: 1, statedAmount: 1000 }),
    );

    unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );

    expect(unwrap(await listAdjustments(entries))).toEqual([]);
  });

  it('não cria ajuste quando a fatura não tem valor informado', async () => {
    const { createEntry, input, methods, invoices, entries } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: null }));

    unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );

    expect(unwrap(await listAdjustments(entries))).toEqual([]);
  });

  it('não recalcula quando o lançamento não tem meio de pagamento', async () => {
    const { createEntry, input, methods, invoices, entries } = await setup();
    await methods.create(makeCard());
    await invoices.create(makeInvoice({ statedAmount: 1000 }));

    unwrap(await createEntry(input({ amount: 400 })));

    expect(unwrap(await listAdjustments(entries))).toEqual([]);
  });

  it('aborta e faz rollback quando o recálculo falha', async () => {
    const { createEntry, input, methods, invoices, entries } = await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    const error = new ConnectorError('falha ao recalcular');
    invoices.failOnCall(2, error);

    expect(
      unwrapLeft(
        await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
      ),
    ).toBe(error);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('propaga falha ao gravar a edição do lançamento', async () => {
    const { createEntry, updateEntry, input, entries } = await setup();
    const created = unwrap(await createEntry(input()));
    const error = new ConnectorError('falha ao gravar');
    entries.failOnCall(2, error);

    expect(unwrapLeft(await updateEntry(created.uid, input()))).toBe(error);
  });

  it('aborta a edição quando o recálculo falha', async () => {
    const { createEntry, updateEntry, input, methods, invoices, entries } =
      await setup();
    const card = unwrap(await methods.create(makeCard()));
    await invoices.create(makeInvoice({ statedAmount: 1000 }));
    const created = unwrap(
      await createEntry(input({ amount: 400, paymentMethodUid: card.uid })),
    );
    const error = new ConnectorError('falha ao recalcular');
    invoices.failOnCall(2, error);

    expect(
      unwrapLeft(
        await updateEntry(
          created.uid,
          input({ amount: 250, paymentMethodUid: card.uid }),
        ),
      ),
    ).toBe(error);
    const stored = unwrap(await entries.findByUid(created.uid));
    expect(stored?.amount).toBe(400);
  });

  it('propaga falha ao excluir o lançamento', async () => {
    const { createEntry, deleteEntry, input, entries } = await setup();
    const created = unwrap(await createEntry(input()));
    const error = new ConnectorError('falha ao excluir');
    entries.failOnCall(2, error);

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
