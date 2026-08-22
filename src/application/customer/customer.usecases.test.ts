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
  makeSearchCustomersByName,
  makeSearchCustomersByPhone,
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

  it('returns no suggestions for a query shorter than three chars', async () => {
    const repo = fakeRepo();
    const result = await makeSearchCustomersByPhone(repo)('41');
    expect(isRight(result) && result.right).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('returns up to six phone matches', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      customer({ id: i + 1, uid: `customer-${i + 1}`, phone: `4199${i}` }),
    );
    const repo = fakeRepo({ list: vi.fn(async () => right(many)) });
    const result = await makeSearchCustomersByPhone(repo)('4199');
    expect(isRight(result) && result.right).toHaveLength(6);
  });

  it('skips customers without a phone when matching', async () => {
    const withoutPhone = customer({
      id: 2,
      uid: 'customer-2',
      phone: undefined,
    });
    const withPhone = customer({ id: 1, uid: 'customer-1', phone: '4199' });
    const repo = fakeRepo({
      list: vi.fn(async () => right([withoutPhone, withPhone])),
    });
    const result = await makeSearchCustomersByPhone(repo)('4199');
    expect(isRight(result) && result.right).toEqual([withPhone]);
  });

  it('propagates a failure when listing for search', async () => {
    const repo = fakeRepo({
      list: vi.fn(async () => left(new ConnectorError('x'))),
    });
    const result = await makeSearchCustomersByPhone(repo)('4199');
    expect(isLeft(result)).toBe(true);
  });

  it('returns no name suggestions for an empty query', async () => {
    const repo = fakeRepo();
    const result = await makeSearchCustomersByName(repo)('');
    expect(isRight(result) && result.right).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('returns no name suggestions for a query with only spaces', async () => {
    const repo = fakeRepo();
    const result = await makeSearchCustomersByName(repo)('   ');
    expect(isRight(result) && result.right).toEqual([]);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('matches names case-insensitively by substring', async () => {
    const maju = customer({ id: 1, uid: 'customer-1', name: 'Maju' });
    const marcos = customer({ id: 2, uid: 'customer-2', name: 'Marcos' });
    const repo = fakeRepo({
      list: vi.fn(async () => right([maju, marcos])),
    });
    const result = await makeSearchCustomersByName(repo)('ma');
    expect(isRight(result) && result.right).toEqual([maju, marcos]);
  });

  it('returns no results when no name matches', async () => {
    const repo = fakeRepo({
      list: vi.fn(async () => right([customer({ name: 'Maju' })])),
    });
    const result = await makeSearchCustomersByName(repo)('zzz');
    expect(isRight(result) && result.right).toEqual([]);
  });

  it('returns up to six name matches', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      customer({ id: i + 1, uid: `customer-${i + 1}`, name: `Maju ${i}` }),
    );
    const repo = fakeRepo({ list: vi.fn(async () => right(many)) });
    const result = await makeSearchCustomersByName(repo)('maju');
    expect(isRight(result) && result.right).toHaveLength(6);
  });

  it('propagates a failure when listing for name search', async () => {
    const repo = fakeRepo({
      list: vi.fn(async () => left(new ConnectorError('x'))),
    });
    const result = await makeSearchCustomersByName(repo)('maju');
    expect(isLeft(result)).toBe(true);
  });
});
