import type { Either } from '../shared/either';
import type { Observable } from '../shared/observable';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { NewOrder, Order, OrderStage } from './order.entity';

export interface OrderRepository {
  create(order: NewOrder): Promise<Either<InfrastructureError, Order>>;
  listAll(): Promise<Either<InfrastructureError, Order[]>>;
  listBySession(
    sessionUid: string,
  ): Promise<Either<InfrastructureError, Order[]>>;
  observeBySession(sessionUid: string): Observable<Order[]>;
  observeActiveStages(): Observable<Order[]>;
  markAsPaid(
    uid: string,
    paymentMethod: string,
  ): Promise<Either<InfrastructureError, void>>;
  cancel(uid: string): Promise<Either<InfrastructureError, void>>;
  setStage(
    uid: string,
    stage: OrderStage,
  ): Promise<Either<InfrastructureError, void>>;
}
