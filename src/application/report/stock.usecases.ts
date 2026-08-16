import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Product } from '../../domain/product/product.entity';
import type { ProductRepository } from '../../domain/product/product.repository';

export function makeLoadStockReport(products: ProductRepository) {
  return async (): Promise<Either<AppError, Product[]>> => {
    const result = await products.list();
    if (isLeft(result)) return result;
    return right([...result.right].sort((a, b) => a.stock - b.stock));
  };
}
