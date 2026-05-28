import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';

export interface StockDecrement {
  productId: number;
  qty: number;
}

export interface ProductRepository {
  decrementStock(
    decrements: StockDecrement[],
  ): Promise<Either<InfrastructureError, void>>;
}
