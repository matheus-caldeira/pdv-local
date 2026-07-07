import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Product } from '../../domain/product/product.entity';
import type { ProductRepository } from '../../domain/product/product.repository';
import {
  buildProduct,
  type ProductInput,
} from '../../domain/product/product.rules';

export function makeListProducts(repository: ProductRepository) {
  return (): Promise<Either<AppError, Product[]>> => repository.list();
}

export function makeListActiveProducts(repository: ProductRepository) {
  return async (): Promise<Either<AppError, Product[]>> => {
    const result = await repository.list();
    if (isLeft(result)) return result;
    return right(result.right.filter((product) => product.active !== false));
  };
}

export function makeCreateProduct(repository: ProductRepository) {
  return async (input: ProductInput): Promise<Either<AppError, Product>> => {
    const built = buildProduct(input);
    if (isLeft(built)) return built;
    return repository.create(built.right);
  };
}

export function makeUpdateProduct(repository: ProductRepository) {
  return async (
    id: number,
    input: ProductInput,
  ): Promise<Either<AppError, Product>> => {
    const built = buildProduct(input);
    if (isLeft(built)) return built;
    return repository.update(id, built.right);
  };
}

export function makeRemoveProduct(repository: ProductRepository) {
  return (id: number): Promise<Either<AppError, void>> => repository.remove(id);
}
