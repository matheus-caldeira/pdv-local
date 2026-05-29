import { describe, expect, it, vi } from 'vitest';
import { isLeft, isRight, right } from '../../domain/shared/either';
import { InvalidProductError } from '../../domain/errors';
import type { Product } from '../../domain/product/product.entity';
import type { ProductRepository } from '../../domain/product/product.repository';
import type { ProductInput } from '../../domain/product/product.rules';
import {
  makeCreateProduct,
  makeListProducts,
  makeRemoveProduct,
  makeUpdateProduct,
} from './product.usecases';

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'X',
  category: 'C',
  costPrice: 1,
  salePrice: 10,
  stock: 5,
  active: true,
  customizationGroupIds: [],
  ...over,
});

function fakeRepo(): ProductRepository {
  return {
    list: vi.fn(async () => right([] as Product[])),
    create: vi.fn(async (p) => right({ ...p, id: 1 } as Product)),
    update: vi.fn(async (id, p) => right({ ...p, id } as Product)),
    remove: vi.fn(async () => right(undefined)),
    decrementStock: vi.fn(async () => right(undefined)),
    removeCustomizationGroup: vi.fn(async () => right(undefined)),
  };
}

describe('product use cases', () => {
  it('lists products', async () => {
    const repo = fakeRepo();
    await makeListProducts(repo)();
    expect(repo.list).toHaveBeenCalled();
  });

  it('creates a valid product', async () => {
    const repo = fakeRepo();
    const result = await makeCreateProduct(repo)(input());
    expect(isRight(result)).toBe(true);
    expect(repo.create).toHaveBeenCalled();
  });

  it('does not create an invalid product', async () => {
    const repo = fakeRepo();
    const result = await makeCreateProduct(repo)(input({ name: '' }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(InvalidProductError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('updates a valid product', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateProduct(repo)(7, input());
    expect(isRight(result) && result.right.id).toBe(7);
  });

  it('does not update an invalid product', async () => {
    const repo = fakeRepo();
    const result = await makeUpdateProduct(repo)(7, input({ salePrice: 0 }));
    expect(isLeft(result)).toBe(true);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('removes a product', async () => {
    const repo = fakeRepo();
    await makeRemoveProduct(repo)(3);
    expect(repo.remove).toHaveBeenCalledWith(3);
  });
});
