import { left, right, type Either } from '../shared/either';
import { InvalidProductError } from '../errors';
import type { NewProduct } from './product.entity';

export interface ProductInput {
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
  customizationGroupIds: number[];
}

export function buildProduct(
  input: ProductInput,
): Either<InvalidProductError, NewProduct> {
  const name = input.name.trim();
  if (!name) {
    return left(new InvalidProductError('Informe o nome do produto.'));
  }
  if (input.salePrice <= 0) {
    return left(new InvalidProductError('Informe o preço de venda.'));
  }
  const now = Date.now();
  return right({
    name,
    category: input.category.trim(),
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    stock: input.stock,
    active: input.active,
    customizationGroupIds: input.customizationGroupIds,
    createdAt: now,
    updatedAt: now,
  });
}
