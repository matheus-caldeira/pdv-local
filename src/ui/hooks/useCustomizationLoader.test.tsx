import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useCustomizationLoader } from './useCustomizationLoader';
import type { Product } from '../../domain/product/product.entity';

const loadProductCustomizations = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    loadProductCustomizations: (ids: number[]) =>
      loadProductCustomizations(ids),
  },
}));

function product(ids: number[]): Product {
  return {
    id: 1,
    uid: 'product-1',
    name: 'X',
    category: 'c',
    costPrice: 1,
    salePrice: 2,
    stock: 5,
    tracksStock: true,
    active: true,
    customizationGroupIds: ids,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('useCustomizationLoader', () => {
  beforeEach(() => {
    loadProductCustomizations.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('passes an empty list when the product has no group ids', async () => {
    loadProductCustomizations.mockResolvedValue(right([]));
    const { result } = renderHook(() => useCustomizationLoader());
    const groups = await result.current({
      ...product([]),
      customizationGroupIds: undefined as unknown as number[],
    });
    expect(groups).toEqual([]);
    expect(loadProductCustomizations).toHaveBeenCalledWith([]);
  });

  it('returns the groups loaded by the use case', async () => {
    loadProductCustomizations.mockResolvedValue(
      right([
        { id: 10, name: 'Adicionais', items: [{ id: 1, name: 'Bacon' }] },
      ]),
    );
    const { result } = renderHook(() => useCustomizationLoader());
    const groups = await result.current(product([10]));
    expect(groups).toHaveLength(1);
    expect(groups[0].items[0].name).toBe('Bacon');
  });

  it('returns an empty list when the use case fails', async () => {
    loadProductCustomizations.mockResolvedValue(left(new ConnectorError('x')));
    const { result } = renderHook(() => useCustomizationLoader());
    const groups = await result.current(product([10]));
    expect(groups).toEqual([]);
  });
});
