import { liveQuery } from 'dexie';
import { left, right, type Either } from '../../../domain/shared/either';
import type { Observable } from '../../../domain/shared/observable';
import type {
  NewOrder,
  Order,
  OrderStage,
} from '../../../domain/order/order.entity';
import type { OrderRepository } from '../../../domain/order/order.repository';
import type { InfrastructureError } from '../../errors';
import type { PDVDatabase } from '../dexie-database';
import { toInfrastructureError } from '../dexie-errors';

const ACTIVE_STAGES: OrderStage[] = ['aceito', 'em_preparo', 'a_caminho'];

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

  async listAll(): Promise<Either<InfrastructureError, Order[]>> {
    try {
      const orders = await this.db.orders.toArray();
      orders.sort((a, b) => b.createdAt - a.createdAt);
      return right(orders);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async listBySession(
    sessionId: number,
  ): Promise<Either<InfrastructureError, Order[]>> {
    try {
      const orders = await this.db.orders
        .where('sessionId')
        .equals(sessionId)
        .toArray();
      return right(orders);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  observeBySession(sessionId: number): Observable<Order[]> {
    return liveQuery(() =>
      this.db.orders.where('sessionId').equals(sessionId).toArray(),
    );
  }

  observeActiveStages(): Observable<Order[]> {
    return liveQuery(() =>
      this.db.orders
        .where('stage')
        .anyOf(ACTIVE_STAGES)
        .filter((order) => order.status !== 'cancelled')
        .toArray(),
    );
  }

  async markAsPaid(
    id: number,
    paymentMethod: string,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.orders.update(id, {
        status: 'paid',
        paymentMethod,
        updatedAt: Date.now(),
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async cancel(id: number): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.orders.update(id, {
        status: 'cancelled',
        updatedAt: Date.now(),
      });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }

  async setStage(
    id: number,
    stage: OrderStage,
  ): Promise<Either<InfrastructureError, void>> {
    try {
      await this.db.orders.update(id, { stage, updatedAt: Date.now() });
      return right(undefined);
    } catch (cause) {
      return left(toInfrastructureError(cause));
    }
  }
}
