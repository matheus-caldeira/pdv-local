import type { Either } from '../shared/either';
import type { Observable } from '../shared/observable';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { NewOrder, Order, OrderStage } from './order.entity';

export interface OrderRepository {
  create(order: NewOrder): Promise<Either<InfrastructureError, Order>>;
  listAll(): Promise<Either<InfrastructureError, Order[]>>;
  listBySession(
    sessionId: number,
  ): Promise<Either<InfrastructureError, Order[]>>;
  observeBySession(sessionId: number): Observable<Order[]>;
  observeActiveStages(): Observable<Order[]>;
  markAsPaid(
    id: number,
    paymentMethod: string,
  ): Promise<Either<InfrastructureError, void>>;
  cancel(id: number): Promise<Either<InfrastructureError, void>>;
  setStage(
    id: number,
    stage: OrderStage,
  ): Promise<Either<InfrastructureError, void>>;
}
