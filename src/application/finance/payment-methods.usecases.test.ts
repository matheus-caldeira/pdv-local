import { beforeEach, describe, expect, it } from 'vitest';
import { isLeft, isRight, left } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import type { PaymentMethod } from '../../domain/finance/payment-method.entity';
import type { PaymentMethodRepository } from '../../domain/finance/payment-method.repository';
import {
  FakePaymentMethodRepository,
  FakeFinanceEntryRepository,
} from './fakes';
import {
  makeArchivePaymentMethod,
  makeCreatePaymentMethod,
  makeListPaymentMethods,
  makeUpdatePaymentMethod,
} from './payment-methods.usecases';

describe('payment methods use cases', () => {
  let methods: FakePaymentMethodRepository;
  let entries: FakeFinanceEntryRepository;

  beforeEach(() => {
    methods = new FakePaymentMethodRepository();
    entries = new FakeFinanceEntryRepository();
  });

  const creditInput = {
    name: 'Nubank',
    type: 'credit' as const,
    closingDay: 25,
    dueDay: 5,
  };

  it('cria um cartão de crédito válido', async () => {
    const create = makeCreatePaymentMethod(methods);
    const result = await create(creditInput);
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.closingDay).toBe(25);
    expect(result.right.archived).toBe(false);
  });

  it('rejeita crédito sem dia de fechamento', async () => {
    const create = makeCreatePaymentMethod(methods);
    const result = await create({ ...creditInput, closingDay: null });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('finance/invalid-card-day');
  });

  it('rejeita dia fora de 1..31', async () => {
    const create = makeCreatePaymentMethod(methods);
    const result = await create({ ...creditInput, dueDay: 32 });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('finance/invalid-card-day');
  });

  it('aceita dia 31', async () => {
    const create = makeCreatePaymentMethod(methods);
    const result = await create({ ...creditInput, closingDay: 31, dueDay: 31 });
    expect(isRight(result)).toBe(true);
  });

  it('zera os dias para tipos que não são crédito', async () => {
    const create = makeCreatePaymentMethod(methods);
    const result = await create({
      name: 'Pix',
      type: 'pix',
      closingDay: 10,
      dueDay: 20,
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.closingDay).toBeNull();
    expect(result.right.dueDay).toBeNull();
  });

  it('lista os cadastrados', async () => {
    const create = makeCreatePaymentMethod(methods);
    await create(creditInput);
    const list = makeListPaymentMethods(methods);
    const result = await list();
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right).toHaveLength(1);
  });

  it('atualiza o nome', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    const update = makeUpdatePaymentMethod(methods);
    const result = await update(created.right.uid, {
      ...creditInput,
      name: 'Nubank Roxinho',
    });
    expect(isRight(result)).toBe(true);
    if (!isRight(result)) return;
    expect(result.right.name).toBe('Nubank Roxinho');
  });

  it('devolve Left ao atualizar uid inexistente', async () => {
    const update = makeUpdatePaymentMethod(methods);
    const result = await update('nao-existe', creditInput);
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('finance/payment-method-not-found');
  });

  it('propaga falha ao buscar antes de atualizar', async () => {
    const error = new ConnectorError('falha simulada');
    methods.failNext(error);
    const update = makeUpdatePaymentMethod(methods);
    const result = await update('qualquer', creditInput);
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left).toBe(error);
  });

  it('rejeita dia inválido ao atualizar', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    const update = makeUpdatePaymentMethod(methods);
    const result = await update(created.right.uid, {
      ...creditInput,
      dueDay: 0,
    });
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('finance/invalid-card-day');
  });

  it('propaga falha ao buscar antes de arquivar', async () => {
    const error = new ConnectorError('falha simulada');
    methods.failNext(error);
    const archive = makeArchivePaymentMethod(methods, entries);
    const result = await archive('qualquer');
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left).toBe(error);
  });

  it('propaga falha ao listar lançamentos do meio de pagamento', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    const error = new ConnectorError('falha simulada');
    entries.failNext(error);
    const archive = makeArchivePaymentMethod(methods, entries);
    const result = await archive(created.right.uid);
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left).toBe(error);
  });

  it('propaga falha ao marcar como arquivado', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    await entries.create({
      uid: 'e1',
      description: 'Mercado',
      amount: 100,
      kind: 'expense',
      categoryUid: 'cat-1',
      memberUids: ['m1'],
      date: Date.now(),
      month: '2026-07',
      status: 'pending',
      source: 'manual',
      sourceUid: null,
      installmentNumber: null,
      sourceEntryUids: [],
      formulaBaseMonth: null,
      paymentMethodUid: created.right.uid,
      invoiceMonth: '2026-08',
      invoiceUid: null,
      createdAt: 1,
      updatedAt: 1,
    });
    const error = new ConnectorError('falha simulada');
    const failingMethods: PaymentMethodRepository = {
      list: (...args) => methods.list(...args),
      findByUid: (...args) => methods.findByUid(...args),
      create: (...args) => methods.create(...args),
      delete: (...args) => methods.delete(...args),
      update: async () => left<ConnectorError, PaymentMethod>(error),
    };
    const archive = makeArchivePaymentMethod(failingMethods, entries);
    const result = await archive(created.right.uid);
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left).toBe(error);
  });

  it('exclui quando não há lançamentos do próprio meio de pagamento', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    await entries.create({
      uid: 'other',
      description: 'Mercado',
      amount: 100,
      kind: 'expense',
      categoryUid: 'cat-1',
      memberUids: ['m1'],
      date: Date.now(),
      month: '2026-07',
      status: 'pending',
      source: 'manual',
      sourceUid: null,
      installmentNumber: null,
      sourceEntryUids: [],
      formulaBaseMonth: null,
      paymentMethodUid: 'another-card',
      invoiceMonth: '2026-08',
      invoiceUid: null,
      createdAt: 1,
      updatedAt: 1,
    });
    const archive = makeArchivePaymentMethod(methods, entries);
    const result = await archive(created.right.uid);
    expect(isRight(result)).toBe(true);
    const list = await methods.list();
    if (!isRight(list)) return;
    expect(list.right).toHaveLength(0);
  });

  it('arquiva quando há lançamentos', async () => {
    const create = makeCreatePaymentMethod(methods);
    const created = await create(creditInput);
    if (!isRight(created)) throw new Error('setup');
    await entries.create({
      uid: 'e1',
      description: 'Mercado',
      amount: 100,
      kind: 'expense',
      categoryUid: 'cat-1',
      memberUids: ['m1'],
      date: Date.now(),
      month: '2026-07',
      status: 'pending',
      source: 'manual',
      sourceUid: null,
      installmentNumber: null,
      sourceEntryUids: [],
      formulaBaseMonth: null,
      paymentMethodUid: created.right.uid,
      invoiceMonth: '2026-08',
      invoiceUid: null,
      createdAt: 1,
      updatedAt: 1,
    });
    const archive = makeArchivePaymentMethod(methods, entries);
    const result = await archive(created.right.uid);
    expect(isRight(result)).toBe(true);
    const list = await methods.list();
    if (!isRight(list)) return;
    expect(list.right[0].archived).toBe(true);
  });

  it('devolve Left ao arquivar uid inexistente', async () => {
    const archive = makeArchivePaymentMethod(methods, entries);
    const result = await archive('nao-existe');
    expect(isLeft(result)).toBe(true);
    if (!isLeft(result)) return;
    expect(result.left.code).toBe('finance/payment-method-not-found');
  });
});
