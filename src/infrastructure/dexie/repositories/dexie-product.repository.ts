import { left, right, type Either } from '../../../domain/shared/either';
import type {
  ProductRepository,
  StockDecrement,
} from '../../../domain/product/product.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieProductRepository implements ProductRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async decrementStock(
    decrements: StockDecrement[],
  ): Promise<Either<InfrastructureError, void>> {
    try {
      for (const decrement of decrements) {
        const product = await this.db.products.get(decrement.productId);
        if (product && product.stock > 0) {
          await this.db.products.update(decrement.productId, {
            stock: product.stock - decrement.qty,
          });
        }
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
