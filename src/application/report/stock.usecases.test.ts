import { describe, expect, it } from 'vitest';
import { isLeft, isRight, left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Product } from '../../domain/product/product.entity';
import type { ProductRepository } from '../../domain/product/product.repository';
import { makeLoadStockReport } from './stock.usecases';

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeRepository(products: Product[]): ProductRepository {
  return {
    async list() {
      return right(products);
    },
  } as unknown as ProductRepository;
}

function makeFailingRepository(): ProductRepository {
  return {
    async list() {
      return left(new FakeError('falha estoque'));
    },
  } as unknown as ProductRepository;
}

describe('makeLoadStockReport', () => {
  it('ordena os produtos pelo estoque mais baixo', async () => {
    const products = [
      { uid: 'a', name: 'Refri', stock: 12 },
      { uid: 'b', name: 'Cachorro', stock: 2 },
      { uid: 'c', name: 'Pipoca', stock: 7 },
    ] as Product[];

    const result = await makeLoadStockReport(makeRepository(products))();

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.map((product) => product.name)).toEqual([
        'Cachorro',
        'Pipoca',
        'Refri',
      ]);
    }
  });

  it('não inclui produtos que não controlam estoque', async () => {
    const products = [
      { uid: 'a', name: 'Refri', stock: 12, tracksStock: true },
      { uid: 'b', name: 'Servico', stock: 0, tracksStock: false },
    ] as Product[];

    const result = await makeLoadStockReport(makeRepository(products))();

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.map((product) => product.name)).toEqual(['Refri']);
    }
  });

  it('devolve lista vazia quando não há produtos', async () => {
    const result = await makeLoadStockReport(makeRepository([]))();

    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right).toEqual([]);
  });

  it('propaga o erro quando a listagem falha', async () => {
    const result = await makeLoadStockReport(makeFailingRepository())();

    expect(isLeft(result)).toBe(true);
  });
});
