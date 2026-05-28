import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { NewProduct, Product } from './product.entity';

export interface StockDecrement {
  productId: number;
  qty: number;
}

export interface ProductRepository {
  list(): Promise<Either<InfrastructureError, Product[]>>;
  create(product: NewProduct): Promise<Either<InfrastructureError, Product>>;
  update(
    id: number,
    product: NewProduct,
  ): Promise<Either<InfrastructureError, Product>>;
  remove(id: number): Promise<Either<InfrastructureError, void>>;
  decrementStock(
    decrements: StockDecrement[],
  ): Promise<Either<InfrastructureError, void>>;
  removeCustomizationGroup(
    groupId: number,
  ): Promise<Either<InfrastructureError, void>>;
}
