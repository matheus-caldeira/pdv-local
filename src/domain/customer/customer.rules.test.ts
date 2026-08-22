import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { InvalidCustomerError } from '../errors';
import { getBusinessType } from '../business-type/registry';
import { buildCustomer, type CustomerInput } from './customer.rules';

const quickSale = getBusinessType('quick_sale')!;

const input = (over: Partial<CustomerInput> = {}): CustomerInput => ({
  name: 'Maria',
  phone: '41999',
  addresses: ['Rua A'],
  ...over,
});

describe('buildCustomer', () => {
  it('normalizes a valid customer', () => {
    const result = buildCustomer(
      input({
        name: '  Maria  ',
        phone: '  41999  ',
        addresses: ['  Rua A  '],
      }),
      quickSale,
    );
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.name).toBe('Maria');
      expect(result.right.phone).toBe('41999');
      expect(result.right.addresses).toEqual(['Rua A']);
    }
  });

  it('drops blank addresses', () => {
    const result = buildCustomer(
      input({ addresses: ['Rua A', '  ', ''] }),
      quickSale,
    );
    expect(isRight(result) && result.right.addresses).toEqual(['Rua A']);
  });

  it('rejects a blank phone', () => {
    const result = buildCustomer(input({ phone: '  ' }), quickSale);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCustomerError);
    }
  });

  it('carries the extra fields through', () => {
    const result = buildCustomer(
      input({ extra: { section: 'lobinho', guardian: 'Ana' } }),
      quickSale,
    );
    expect(isRight(result) && result.right.extra).toEqual({
      section: 'lobinho',
      guardian: 'Ana',
    });
  });

  it('defaults extra to an empty object when omitted', () => {
    const result = buildCustomer(input(), quickSale);
    expect(isRight(result) && result.right.extra).toEqual({});
  });
});

describe('buildCustomer por tipo de negócio', () => {
  const scout = getBusinessType('scout')!;
  const tab = getBusinessType('tab')!;

  it('aceita cliente escoteiro sem telefone', () => {
    const result = buildCustomer(
      {
        name: 'Maju',
        phone: '',
        addresses: [],
        extra: { section: 'lobinho' },
      },
      scout,
    );

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.phone).toBe('');
      expect(result.right.extra.section).toBe('lobinho');
    }
  });

  it('exige seção do escoteiro', () => {
    const result = buildCustomer(
      { name: 'Maju', phone: '', addresses: [], extra: {} },
      scout,
    );

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INVALID_CUSTOMER');
  });

  it('aceita escoteiro sem responsável', () => {
    const result = buildCustomer(
      {
        name: 'Maju',
        phone: '',
        addresses: [],
        extra: { section: 'escoteiro' },
      },
      scout,
    );

    expect(isRight(result)).toBe(true);
  });

  it('exige nome em qualquer tipo', () => {
    const result = buildCustomer(
      { name: '  ', phone: '', addresses: [], extra: { section: 'senior' } },
      scout,
    );

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INVALID_CUSTOMER');
  });

  it('exige telefone fora do escoteiro', () => {
    const result = buildCustomer(
      { name: 'João', phone: '', addresses: [], extra: {} },
      tab,
    );

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INVALID_CUSTOMER');
  });

  it('aceita cliente com telefone fora do escoteiro', () => {
    const result = buildCustomer(
      { name: 'João', phone: '11999999999', addresses: [], extra: {} },
      tab,
    );

    expect(isRight(result)).toBe(true);
  });
});
