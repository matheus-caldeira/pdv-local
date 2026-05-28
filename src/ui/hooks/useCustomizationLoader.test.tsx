import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCustomizationLoader } from './useCustomizationLoader';
import type { Product } from '../../domain/product/product.entity';

const groupGet = vi.fn();
const itemsWhere = vi.fn();

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({
    customizationGroups: { get: groupGet },
    customizationItems: {
      where: () => ({ equals: () => ({ toArray: itemsWhere }) }),
    },
  }),
}));

function product(ids: number[]): Product {
  return {
    id: 1,
    name: 'X',
    category: 'c',
    costPrice: 1,
    salePrice: 2,
    stock: 5,
    active: true,
    customizationGroupIds: ids,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('useCustomizationLoader', () => {
  beforeEach(() => {
    groupGet.mockReset();
    itemsWhere.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('returns empty when there are no group ids', async () => {
    const { result } = renderHook(() => useCustomizationLoader());
    const groups = await result.current({
      ...product([]),
      customizationGroupIds: undefined as unknown as number[],
    });
    expect(groups).toEqual([]);
  });

  it('skips missing groups and filters inactive items', async () => {
    groupGet.mockImplementation((id: number) =>
      id === 10 ? { id: 10, name: 'Adicionais' } : undefined,
    );
    itemsWhere.mockResolvedValue([
      { id: 1, active: true, name: 'Bacon' },
      { id: 2, active: false, name: 'Off' },
    ]);
    const { result } = renderHook(() => useCustomizationLoader());
    const groups = await result.current(product([10, 99]));
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].name).toBe('Bacon');
  });
});
