import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { InvalidCustomerError } from '../errors';
import { buildCustomer, type CustomerInput } from './customer.rules';

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
    );
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.name).toBe('Maria');
      expect(result.right.phone).toBe('41999');
      expect(result.right.addresses).toEqual(['Rua A']);
    }
  });

  it('defaults the name to Consumidor when blank', () => {
    const result = buildCustomer(input({ name: '   ' }));
    expect(isRight(result) && result.right.name).toBe('Consumidor');
  });

  it('drops blank addresses', () => {
    const result = buildCustomer(input({ addresses: ['Rua A', '  ', ''] }));
    expect(isRight(result) && result.right.addresses).toEqual(['Rua A']);
  });

  it('rejects a blank phone', () => {
    const result = buildCustomer(input({ phone: '  ' }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCustomerError);
    }
  });
});
