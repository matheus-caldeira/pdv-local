import { describe, expect, it } from 'vitest';
import { isLeft, isRight, type Either } from '../../domain/shared/either';
import { createUid } from '../../domain/shared/uid';
import {
  InvoiceNotFoundError,
  InvoiceOverdetailedError,
  InvoicePaidError,
  InvalidFinanceAmountError,
  PaymentMethodNotFoundError,
} from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type {
  MonthKey,
  NewFinanceEntry,
} from '../../domain/finance/finance.entity';
import type {
  NewCardInvoice,
  NewPaymentMethod,
} from '../../domain/finance/payment-method.entity';
import { dateForMonthDay } from '../../domain/finance/finance.rules';
import {
  FakeCardInvoiceRepository,
  FakeFinanceCategoryRepository,
  FakeFinanceEntryRepository,
  FakePaymentMethodRepository,
  makeFakeUnitOfWork,
} from './fakes';
import {
  INVOICE_ADJUSTMENT_CATEGORY_NAME,
  makeGetInvoiceDetail,
  makeListInvoiceHistory,
  makePayInvoice,
  makeSetInvoiceAmount,
} from './invoices.usecases';

const unwrap = <E, A>(either: Either<E, A>): A =>
  isRight(either) ? either.right : expect.unreachable('esperava Right');

const unwrapLeft = <E, A>(either: Either<E, A>): E =>
  isLeft(either) ? either.left : expect.unreachable('esperava Left');

const CARD_UID = 'card-1';
const DUE_MONTH: MonthKey = '2026-08';

const makeCard = (
  overrides: Partial<NewPaymentMethod> = {},
): NewPaymentMethod => ({
  uid: CARD_UID,
  name: 'Cartão Nubank',
  type: 'credit',
  closingDay: 20,
  dueDay: 5,
  archived: false,
  createdAt: 1,
  ...overrides,
});

const makeInvoice = (
  overrides: Partial<NewCardInvoice> = {},
): NewCardInvoice => ({
  uid: createUid(),
  paymentMethodUid: CARD_UID,
  month: DUE_MONTH,
  dueDate: dateForMonthDay(DUE_MONTH, 5),
  statedAmount: null,
  status: 'open',
  paidAt: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const makeInvoiceEntry = (
  overrides: Partial<NewFinanceEntry> = {},
): NewFinanceEntry => {
  const month = overrides.month ?? '2026-07';
  return {
    uid: createUid(),
    description: 'Compra no cartão',
    amount: 100,
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
    paymentMethodUid: CARD_UID,
    invoiceMonth: DUE_MONTH,
    invoiceUid: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
};

const setup = () => {
  const entries = new FakeFinanceEntryRepository();
  const invoices = new FakeCardInvoiceRepository();
  const methods = new FakePaymentMethodRepository();
  const categories = new FakeFinanceCategoryRepository();
  const uow = makeFakeUnitOfWork({
    financeEntries: entries,
    financeCardInvoices: invoices,
    financePaymentMethods: methods,
  });
  return {
    entries,
    invoices,
    methods,
    categories,
    uow,
    getInvoiceDetail: makeGetInvoiceDetail(invoices, entries),
    setInvoiceAmount: makeSetInvoiceAmount(uow, methods, categories),
    payInvoice: makePayInvoice(invoices),
    listInvoiceHistory: makeListInvoiceHistory(invoices),
  };
};

describe('makeGetInvoiceDetail', () => {
  it('devolve fatura vazia quando não existe', async () => {
    const { getInvoiceDetail } = setup();

    const detail = unwrap(await getInvoiceDetail(CARD_UID, DUE_MONTH));

    expect(detail.invoice).toBeNull();
    expect(detail.entries).toEqual([]);
    expect(detail.detailedTotal).toBe(0);
    expect(detail.reconciliation).toEqual({ kind: 'balanced' });
  });

  it('soma os lançamentos da fatura em detailedTotal', async () => {
    const { entries, invoices, getInvoiceDetail } = setup();
    await invoices.create(makeInvoice({ statedAmount: null }));
    await entries.create(makeInvoiceEntry({ amount: 100 }));
    await entries.create(makeInvoiceEntry({ amount: 250 }));

    const detail = unwrap(await getInvoiceDetail(CARD_UID, DUE_MONTH));

    expect(detail.entries).toHaveLength(2);
    expect(detail.detailedTotal).toBe(350);
  });

  it('exclui o lançamento de ajuste do detailedTotal', async () => {
    const { entries, invoices, getInvoiceDetail } = setup();
    const invoice = unwrap(await invoices.create(makeInvoice()));
    await entries.create(makeInvoiceEntry({ amount: 100 }));
    await entries.create(
      makeInvoiceEntry({
        amount: 400,
        source: 'invoice-adjustment',
        sourceUid: invoice.uid,
        invoiceUid: invoice.uid,
        month: DUE_MONTH,
      }),
    );

    const detail = unwrap(await getInvoiceDetail(CARD_UID, DUE_MONTH));

    expect(detail.detailedTotal).toBe(100);
  });

  it('propaga falha ao buscar a fatura', async () => {
    const { invoices, getInvoiceDetail } = setup();
    const error = new ConnectorError('falha simulada');
    invoices.failNext(error);

    expect(unwrapLeft(await getInvoiceDetail(CARD_UID, DUE_MONTH))).toBe(error);
  });

  it('propaga falha ao listar lançamentos', async () => {
    const { entries, invoices, getInvoiceDetail } = setup();
    await invoices.create(makeInvoice());
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await getInvoiceDetail(CARD_UID, DUE_MONTH))).toBe(error);
  });
});

describe('makeSetInvoiceAmount', () => {
  it('cria ajuste com a diferença entre valor informado e detalhado', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.statedAmount).toBe(1000);
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(600);
    expect(adjustments[0].kind).toBe('expense');
    expect(adjustments[0].source).toBe('invoice-adjustment');
    expect(adjustments[0].invoiceUid).toBe(invoice.uid);
    expect(adjustments[0].sourceUid).toBe(invoice.uid);
    expect(adjustments[0].month).toBe(DUE_MONTH);
  });

  it('atualiza o ajuste em vez de duplicar quando chamado de novo', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 900));

    expect(invoice.statedAmount).toBe(900);
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(500);
  });

  it('encolhe o ajuste ao detalhar mais gastos', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    await entries.create(makeInvoiceEntry({ amount: 300 }));
    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);

    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(300);
  });

  it('não cria ajuste quando o detalhado já bate com o valor informado', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 1000 }));

    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.statedAmount).toBe(1000);
    expect(
      unwrap(await entries.list({ source: 'invoice-adjustment' })),
    ).toEqual([]);
  });

  it('remove o ajuste quando o detalhado bate com o valor informado', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    await entries.create(makeInvoiceEntry({ amount: 600 }));
    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.statedAmount).toBe(1000);
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toEqual([]);
  });

  it('rejeita e não grava nada quando o detalhado supera o valor informado', async () => {
    const { entries, invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 1200 }));

    const error = unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(error).toBeInstanceOf(InvoiceOverdetailedError);
    expect((error as InvoiceOverdetailedError).code).toBe(
      'finance/invoice-overdetailed',
    );
    expect(unwrap(await invoices.listByCard(CARD_UID))).toEqual([]);
    expect(
      unwrap(await entries.list({ source: 'invoice-adjustment' })),
    ).toEqual([]);
  });

  it('rejeita fatura já paga', async () => {
    const { invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await invoices.create(
      makeInvoice({ status: 'paid', paidAt: 123, statedAmount: 1000 }),
    );

    const error = unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 900));

    expect(error).toBeInstanceOf(InvoicePaidError);
  });

  it('rejeita valor não finito sem gravar nada', async () => {
    const { entries, invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());

    const error = unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, NaN));

    expect(error).toBeInstanceOf(InvalidFinanceAmountError);
    expect(unwrap(await invoices.listByCard(CARD_UID))).toEqual([]);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('rejeita valor negativo sem gravar nada', async () => {
    const { entries, invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());

    const error = unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, -50));

    expect(error).toBeInstanceOf(InvalidFinanceAmountError);
    expect(unwrap(await invoices.listByCard(CARD_UID))).toEqual([]);
    expect(unwrap(await entries.list({}))).toEqual([]);
  });

  it('rejeita meio de pagamento inexistente', async () => {
    const { setInvoiceAmount } = setup();

    const error = unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(error).toBeInstanceOf(PaymentMethodNotFoundError);
  });

  it('aumenta o ajuste quando há estorno na fatura', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));
    await entries.create(makeInvoiceEntry({ amount: 100, kind: 'income' }));

    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.statedAmount).toBe(1000);
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(700);
  });

  it('propaga falha ao buscar o meio de pagamento', async () => {
    const { methods, setInvoiceAmount } = setup();
    const error = new ConnectorError('falha simulada');
    methods.failNext(error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao buscar a fatura', async () => {
    const { invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const error = new ConnectorError('falha simulada');
    invoices.failNext(error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao listar lançamentos da fatura', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao criar a fatura', async () => {
    const { invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const error = new ConnectorError('falha ao criar');
    invoices.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao atualizar a fatura existente', async () => {
    const { invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await invoices.create(makeInvoice());
    const error = new ConnectorError('falha ao atualizar');
    invoices.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao criar o ajuste', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const error = new ConnectorError('falha ao criar ajuste');
    entries.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao atualizar o ajuste existente', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    const error = new ConnectorError('falha ao atualizar ajuste');
    entries.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 900))).toBe(
      error,
    );
  });

  it('propaga falha ao remover o ajuste', async () => {
    const { entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    await entries.create(makeInvoiceEntry({ amount: 1000 }));
    const error = new ConnectorError('falha ao remover ajuste');
    entries.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('usa o dia 1 como vencimento quando o cartão não tem dia de vencimento', async () => {
    const { invoices, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard({ dueDay: null }));

    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.dueDate).toBe(dateForMonthDay(DUE_MONTH, 1));
    expect(unwrap(await invoices.listByCard(CARD_UID))).toHaveLength(1);
  });

  it('atualiza a fatura existente preservando dados', async () => {
    const { invoices, entries, methods, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const existing = unwrap(await invoices.create(makeInvoice()));
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    const invoice = unwrap(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000));

    expect(invoice.uid).toBe(existing.uid);
    expect(invoice.statedAmount).toBe(1000);
  });

  it('usa a categoria dedicada no ajuste criado', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);

    const category = unwrap(await categories.list()).find(
      (item) => item.name === INVOICE_ADJUSTMENT_CATEGORY_NAME,
    );
    expect(category).toBeDefined();
    expect(category?.kind).toBe('expense');
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments[0].categoryUid).toBe(category?.uid);
  });

  it('reusa a categoria dedicada existente sem duplicar', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    const existing = unwrap(
      await categories.create({
        name: INVOICE_ADJUSTMENT_CATEGORY_NAME,
        kind: 'expense',
      }),
    );
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);

    const matches = unwrap(await categories.list()).filter(
      (item) => item.name === INVOICE_ADJUSTMENT_CATEGORY_NAME,
    );
    expect(matches).toHaveLength(1);
    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments[0].categoryUid).toBe(existing.uid);
  });

  it('cria a categoria dedicada quando ainda não existe', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    expect(unwrap(await categories.list())).toEqual([]);

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);

    const matches = unwrap(await categories.list()).filter(
      (item) => item.name === INVOICE_ADJUSTMENT_CATEGORY_NAME,
    );
    expect(matches).toHaveLength(1);
  });

  it('não altera a categoria ao atualizar o ajuste existente', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000);
    const before = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    )[0].categoryUid;

    await setInvoiceAmount(CARD_UID, DUE_MONTH, 900);

    const adjustments = unwrap(
      await entries.list({ source: 'invoice-adjustment' }),
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].amount).toBe(500);
    expect(adjustments[0].categoryUid).toBe(before);
    const matches = unwrap(await categories.list()).filter(
      (item) => item.name === INVOICE_ADJUSTMENT_CATEGORY_NAME,
    );
    expect(matches).toHaveLength(1);
  });

  it('propaga falha ao listar categorias na criação do ajuste', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));
    const error = new ConnectorError('falha ao listar categorias');
    categories.failNext(error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });

  it('propaga falha ao criar a categoria dedicada', async () => {
    const { entries, methods, categories, setInvoiceAmount } = setup();
    await methods.create(makeCard());
    await entries.create(makeInvoiceEntry({ amount: 400 }));
    const error = new ConnectorError('falha ao criar categoria');
    categories.failOnCall(2, error);

    expect(unwrapLeft(await setInvoiceAmount(CARD_UID, DUE_MONTH, 1000))).toBe(
      error,
    );
  });
});

describe('makePayInvoice', () => {
  it('marca a fatura como paga e grava paidAt', async () => {
    const { invoices, payInvoice } = setup();
    await invoices.create(makeInvoice({ statedAmount: 1000 }));

    const invoice = unwrap(await payInvoice(CARD_UID, DUE_MONTH, 987));

    expect(invoice.status).toBe('paid');
    expect(invoice.paidAt).toBe(987);
  });

  it('rejeita fatura inexistente', async () => {
    const { payInvoice } = setup();

    expect(
      unwrapLeft(await payInvoice(CARD_UID, DUE_MONTH, 987)),
    ).toBeInstanceOf(InvoiceNotFoundError);
  });

  it('propaga falha ao buscar a fatura', async () => {
    const { invoices, payInvoice } = setup();
    const error = new ConnectorError('falha simulada');
    invoices.failNext(error);

    expect(unwrapLeft(await payInvoice(CARD_UID, DUE_MONTH, 987))).toBe(error);
  });
});

describe('makeListInvoiceHistory', () => {
  it('devolve os meses ordenados com delta em relação ao anterior', async () => {
    const { invoices, listInvoiceHistory } = setup();
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-06', statedAmount: 800 }),
    );
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-07', statedAmount: 1000 }),
    );
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-08', statedAmount: 950 }),
    );

    const history = unwrap(await listInvoiceHistory(CARD_UID, 12));

    expect(history.map((point) => point.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
    expect(history[0].delta).toBeNull();
    expect(history[1].delta).toBe(200);
    expect(history[2].delta).toBe(-50);
  });

  it('respeita o limite de meses mantendo os mais recentes', async () => {
    const { invoices, listInvoiceHistory } = setup();
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-06', statedAmount: 800 }),
    );
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-07', statedAmount: 1000 }),
    );
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-08', statedAmount: 950 }),
    );

    const history = unwrap(await listInvoiceHistory(CARD_UID, 2));

    expect(history.map((point) => point.month)).toEqual(['2026-07', '2026-08']);
    expect(history[0].delta).toBeNull();
    expect(history[1].delta).toBe(-50);
  });

  it('trata faturas sem valor informado como zero', async () => {
    const { invoices, listInvoiceHistory } = setup();
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-07', statedAmount: null }),
    );
    await invoices.create(
      makeInvoice({ uid: createUid(), month: '2026-08', statedAmount: 500 }),
    );

    const history = unwrap(await listInvoiceHistory(CARD_UID, 12));

    expect(history[0].amount).toBe(0);
    expect(history[0].delta).toBeNull();
    expect(history[1].delta).toBe(500);
  });

  it('propaga falha ao listar faturas', async () => {
    const { invoices, listInvoiceHistory } = setup();
    const error = new ConnectorError('falha simulada');
    invoices.failNext(error);

    expect(unwrapLeft(await listInvoiceHistory(CARD_UID, 12))).toBe(error);
  });
});
