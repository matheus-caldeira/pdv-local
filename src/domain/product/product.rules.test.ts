import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { InvalidProductError } from '../errors';
import { buildProduct, type ProductInput } from './product.rules';

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'X-Burger',
  category: 'Lanches',
  costPrice: 5,
  salePrice: 20,
  stock: 10,
  tracksStock: true,
  active: true,
  customizationGroupIds: [],
  ...over,
});

describe('buildProduct', () => {
  it('builds a valid product with trimmed fields', () => {
    const result = buildProduct(input({ name: '  X  ', category: '  L  ' }));
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.name).toBe('X');
      expect(result.right.category).toBe('L');
      expect(result.right.createdAt).toBeGreaterThan(0);
      expect(result.right.updatedAt).toBe(result.right.createdAt);
    }
  });

  it('preserves tracksStock as false when the product is not stock-tracked', () => {
    const result = buildProduct(input({ tracksStock: false }));
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.tracksStock).toBe(false);
    }
  });

  it('rejects an empty name', () => {
    const result = buildProduct(input({ name: '   ' }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidProductError);
      expect(result.left.message).toContain('nome');
    }
  });

  it('rejects a non-positive sale price', () => {
    const result = buildProduct(input({ salePrice: 0 }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.message).toContain('venda');
    }
  });
});
