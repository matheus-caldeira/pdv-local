import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { NewOrder, Order } from './order.entity';

export interface OrderRepository {
  create(order: NewOrder): Promise<Either<InfrastructureError, Order>>;
  listBySession(
    sessionId: number,
  ): Promise<Either<InfrastructureError, Order[]>>;
}
