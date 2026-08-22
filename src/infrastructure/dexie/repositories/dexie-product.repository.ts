import { left, right, type Either } from '../../../domain/shared/either';
import type {
  NewProduct,
  Product,
} from '../../../domain/product/product.entity';
import type {
  ProductRepository,
  StockAdjustment,
} from '../../../domain/product/product.repository';
import { RecordNotFoundError, type InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieProductRepository implements ProductRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async list(): Promise<Either<InfrastructureError, Product[]>> {
    try {
      const products = await this.db.products.toArray();
      products.sort((a, b) => a.name.localeCompare(b.name));
      return right(products);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async create(
    product: NewProduct,
  ): Promise<Either<InfrastructureError, Product>> {
    try {
      const id = await this.db.products.add(product as Product);
      return right({ ...product, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async update(
    id: number,
    product: NewProduct,
  ): Promise<Either<InfrastructureError, Product>> {
    try {
      const existing = await this.db.products.get(id);
      if (!existing) {
        return left(new RecordNotFoundError('Produto não encontrado.'));
      }
      const patch = {
        ...product,
        uid: existing.uid,
        createdAt: existing.createdAt,
      };
      await this.db.products.update(id, patch);
      return right({ ...patch, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async remove(id: number): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.products.delete(id);
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async adjustStock(
    adjustments: StockAdjustment[],
  ): Promise<Either<InfrastructureError, void>> {
    try {
      for (const adjustment of adjustments) {
        const product = await this.db.products
          .filter((p) => p.uid === adjustment.productUid)
          .first();
        if (product && product.id != null) {
          await this.db.products.update(product.id, {
            stock: product.stock - adjustment.qty,
          });
        }
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async removeCustomizationGroup(
    groupId: number,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      const products = await this.db.products.toArray();
      for (const product of products) {
        if (product.id && product.customizationGroupIds.includes(groupId)) {
          await this.db.products.update(product.id, {
            customizationGroupIds: product.customizationGroupIds.filter(
              (id) => id !== groupId,
            ),
          });
        }
      }
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
