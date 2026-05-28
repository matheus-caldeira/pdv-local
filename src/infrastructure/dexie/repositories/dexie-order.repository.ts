import { left, right, type Either } from '../../../domain/shared/either';
import type { NewOrder, Order } from '../../../domain/order/order.entity';
import type { OrderRepository } from '../../../domain/order/order.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

export class DexieOrderRepository implements OrderRepository {
  private readonly db: PDVDatabase;

  constructor(db: PDVDatabase) {
    this.db = db;
  }

  async create(order: NewOrder): Promise<Either<InfrastructureError, Order>> {
    try {
      const id = await this.db.orders.add(order as Order);
      return right({ ...order, id });
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
