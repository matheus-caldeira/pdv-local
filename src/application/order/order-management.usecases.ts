import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Observable } from '../../domain/shared/observable';
import type { Order, OrderStage } from '../../domain/order/order.entity';
import type { OrderRepository } from '../../domain/order/order.repository';

export function makeListOrders(repository: OrderRepository) {
  return (): Promise<Either<AppError, Order[]>> => repository.listAll();
}

export function makeObserveSessionOrders(repository: OrderRepository) {
  return (sessionId: number): Observable<Order[]> =>
    repository.observeBySession(sessionId);
}

export function makeObserveActiveOrders(repository: OrderRepository) {
  return (): Observable<Order[]> => repository.observeActiveStages();
}

export function makeMarkOrderPaid(repository: OrderRepository) {
  return (id: number, paymentMethod: string): Promise<Either<AppError, void>> =>
    repository.markAsPaid(id, paymentMethod);
}

export function makeCancelOrder(repository: OrderRepository) {
  return (id: number): Promise<Either<AppError, void>> => repository.cancel(id);
}

export function makeSetOrderStage(repository: OrderRepository) {
  return (id: number, stage: OrderStage): Promise<Either<AppError, void>> =>
    repository.setStage(id, stage);
}
