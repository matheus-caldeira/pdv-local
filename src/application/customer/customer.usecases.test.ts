import { describe, expect, it, vi } from 'vitest';
import { isLeft, isRight, left, right } from '../../domain/shared/either';
import { DuplicatePhoneError, InvalidCustomerError } from '../../domain/errors';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CustomerRepository } from '../../domain/customer/customer.repository';
import type { CustomerInput } from '../../domain/customer/customer.rules';
import { getBusinessType } from '../../domain/business-type/registry';
import { ConnectorError } from '../../infrastructure/errors';
import {
  makeListCustomers,
  makeRemoveCustomer,
  makeSaveCustomer,
  makeSearchCustomers,
} from './customer.usecases';

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: 1,
  uid: 'customer-1',
  name: 'Maria',
  phone: '41999',
  addresses: [],
  extra: {},
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

function fakeRepo(over: Partial<CustomerRepository> = {}): CustomerRepository {
  return {
    list: vi.fn(async () => right([] as Customer[])),
    findByPhone: vi.fn(async () => right(undefined)),
    create: vi.fn(async (d) => right(customer({ ...d, uid: 'customer-9' }))),
    update: vi.fn(async (uid, d) => right(customer({ ...d, uid }))),
    remove: vi.fn(async () => right(undefined)),
    ...over,
  };
}

const input = (over: Partial<CustomerInput> = {}): CustomerInput => ({
  name: 'Maria',
  phone: '41999',
  addresses: [],
  ...over,
});

const quickSale = getBusinessType('quick_sale')!;
const scout = getBusinessType('scout')!;

describe('customer use cases', () => {
  it('lists customers', async () => {
    const repo = fakeRepo();
    await makeListCustomers(repo)();
    expect(repo.list).toHaveBeenCalled();
  });

  it('removes a customer', async () => {
    const repo = fakeRepo();
    await makeRemoveCustomer(repo)('customer-3');
    expect(repo.remove).toHaveBeenCalledWith('customer-3');
  });

  it('rejects an invalid customer before touching the repo', async () => {
    const repo = fakeRepo();
    const result = await makeSaveCustomer(repo)(
      input({ phone: '' }),
      quickSale,
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result))
      expect(result.left).toBeInstanceOf(InvalidCustomerError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates a new customer when phone is free', async () => {
    const repo = fakeRepo();
    const result = await makeSaveCustomer(repo)(input(), quickSale);
    expect(isRight(result)).toBe(true);
    expect(repo.create).toHaveBeenCalled();
  });

  it('updates the customer with the matching uid', async () => {
    const repo = fakeRepo({
      findByPhone: vi.fn(async () => right(customer({ uid: 'customer-5' }))),
    });
    const result = await makeSaveCustomer(repo)(
      input(),
      quickSale,
      'customer-5',
    );
    expect(isRight(result)).toBe(true);
    expect(repo.update).toHaveBeenCalledWith('customer-5', expect.anything());
  });

  it('persists the extra fields provided in the input', async () => {
    const repo = fakeRepo();
    const result = await makeSaveCustomer(repo)(
      input({ extra: { section: 'lobinho', guardian: 'Ana' } }),
      quickSale,
    );
    expect(isRight(result)).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        extra: { section: 'lobinho', guardian: 'Ana' },
      }),
    );
  });

  it('defaults extra to an empty object when omitted', async () => {
    const repo = fakeRepo();
    const result = await makeSaveCustomer(repo)(input(), quickSale);
    expect(isRight(result)).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ extra: {} }),
    );
  });

  it('rejects a phone already used by another customer', async () => {
    const repo = fakeRepo({
      findByPhone: vi.fn(async () => right(customer({ uid: 'customer-2' }))),
    });
    const result = await makeSaveCustomer(repo)(
      input(),
      quickSale,
      'customer-5',
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(DuplicatePhoneError);
  });

  it('skips the duplicate phone check when the customer has no phone', async () => {
    const repo = fakeRepo();
    const result = await makeSaveCustomer(repo)(
      input({ phone: '', extra: { section: 'lobinho' } }),
      scout,
    );
    expect(isRight(result)).toBe(true);
    expect(repo.findByPhone).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalled();
  });

  it('propagates a failure from findByPhone', async () => {
    const repo = fakeRepo({
      findByPhone: vi.fn(async () => left(new ConnectorError('x'))),
    });
    const result = await makeSaveCustomer(repo)(input(), quickSale);
    expect(isLeft(result)).toBe(true);
  });
});

describe('makeSearchCustomers', () => {
  const customers: Customer[] = [
    {
      uid: 'c-1',
      name: 'Maju Gonçalves',
      phone: '11988887777',
      addresses: [],
      extra: { section: 'lobinho', guardian: 'Ana Paula' },
      createdAt: 1,
      updatedAt: 1,
    },
    {
      uid: 'c-2',
      name: 'Pedro',
      phone: '11911112222',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  it('casa por nome ignorando acento e caixa', async () => {
    const repo = fakeRepo({ list: vi.fn(async () => right(customers)) });
    const search = makeSearchCustomers(repo);

    const result = await search('goncalves');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toHaveLength(1);
  });

  it('casa por telefone', async () => {
    const repo = fakeRepo({ list: vi.fn(async () => right(customers)) });
    const search = makeSearchCustomers(repo);

    const result = await search('9888');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right[0].uid).toBe('c-1');
  });

  it('casa por responsável', async () => {
    const repo = fakeRepo({ list: vi.fn(async () => right(customers)) });
    const search = makeSearchCustomers(repo);

    const result = await search('ana');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right[0].uid).toBe('c-1');
  });

  it('casa por nome quando o cliente não tem telefone', async () => {
    const repo = fakeRepo({
      list: vi.fn(async () =>
        right([
          customer({ uid: 'c-3', name: 'Sem Telefone', phone: undefined }),
        ]),
      ),
    });
    const search = makeSearchCustomers(repo);

    const result = await search('sem telefone');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right[0].uid).toBe('c-3');
  });

  it('devolve vazio para termo em branco', async () => {
    const repo = fakeRepo({ list: vi.fn(async () => right(customers)) });
    const search = makeSearchCustomers(repo);

    const result = await search('   ');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('limita a seis resultados', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      customer({ id: i + 1, uid: `customer-${i + 1}`, name: `Maju ${i}` }),
    );
    const repo = fakeRepo({ list: vi.fn(async () => right(many)) });
    const search = makeSearchCustomers(repo);

    const result = await search('maju');

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toHaveLength(6);
  });

  it('propaga falha do repositório', async () => {
    const search = makeSearchCustomers(
      fakeRepo({ list: vi.fn(async () => left(new ConnectorError('x'))) }),
    );

    const result = await search('maju');

    expect(isLeft(result)).toBe(true);
  });
});
