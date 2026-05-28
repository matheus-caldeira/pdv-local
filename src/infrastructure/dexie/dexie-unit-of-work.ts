import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { TransactionFailedError } from '../errors';
import { DexieOrderRepository } from './repositories/dexie-order.repository';
import { DexieCustomerRepository } from './repositories/dexie-customer.repository';
import { DexieProductRepository } from './repositories/dexie-product.repository';
import { DexieConfigRepository } from './repositories/dexie-config.repository';
import { DexieCustomizationRepository } from './repositories/dexie-customization.repository';
import type { PDVDatabase } from './dexie-database';

class Rollback {
  readonly error: AppError;

  constructor(error: AppError) {
    this.error = error;
  }
}

export class DexieUnitOfWork implements UnitOfWork {
  private readonly db: PDVDatabase;
  private readonly repositories: Repositories;

  constructor(db: PDVDatabase) {
    this.db = db;
    this.repositories = {
      orders: new DexieOrderRepository(db),
      customers: new DexieCustomerRepository(db),
      products: new DexieProductRepository(db),
      config: new DexieConfigRepository(db),
      customizations: new DexieCustomizationRepository(db),
    };
  }

  async run<A>(
    work: (repositories: Repositories) => Promise<Either<AppError, A>>,
  ): Promise<Either<AppError, A>> {
    try {
      const value = await this.db.transaction(
        'rw',
        [
          this.db.orders,
          this.db.customers,
          this.db.products,
          this.db.config,
          this.db.customizationGroups,
          this.db.customizationItems,
        ],
        async () => {
          const result = await work(this.repositories);
          if (isLeft(result)) {
            throw new Rollback(result.left);
          }
          return result.right;
        },
      );
      return right(value);
    } catch (cause) {
      if (cause instanceof Rollback) {
        return left(cause.error);
      }
      return left(
        new TransactionFailedError('A transação foi revertida.', cause),
      );
    }
  }
}
