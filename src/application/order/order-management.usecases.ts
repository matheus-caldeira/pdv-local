import type { Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Observable } from '../../domain/shared/observable';
import type { Order, OrderStage } from '../../domain/order/order.entity';
import type {
  OrderPage,
  OrderQuery,
  OrderRepository,
} from '../../domain/order/order.repository';

export function makeListOrders(repository: OrderRepository) {
  return (): Promise<Either<AppError, Order[]>> => repository.listAll();
}

export function makeListOrderPage(repository: OrderRepository) {
  return (query: OrderQuery): Promise<Either<AppError, OrderPage>> =>
    repository.listPage(query);
}

export function makeListFinishedOrderPage(repository: OrderRepository) {
  return (
    sessionUid: string,
    offset: number,
    limit: number,
  ): Promise<Either<AppError, OrderPage>> =>
    repository.listFinishedPage(sessionUid, offset, limit);
}

export function makeObserveSessionOrders(repository: OrderRepository) {
  return (sessionUid: string): Observable<Order[]> =>
    repository.observeBySession(sessionUid);
}

export function makeObserveActiveSessionOrders(repository: OrderRepository) {
  return (sessionUid: string): Observable<Order[]> =>
    repository.observeActiveBySession(sessionUid);
}

export function makeObserveActiveOrders(repository: OrderRepository) {
  return (): Observable<Order[]> => repository.observeActiveStages();
}

export function makeMarkOrderPaid(repository: OrderRepository) {
  return (
    uid: string,
    paymentMethod: string,
  ): Promise<Either<AppError, void>> =>
    repository.markAsPaid(uid, paymentMethod);
}

export function makeCancelOrder(repository: OrderRepository) {
  return (uid: string): Promise<Either<AppError, void>> =>
    repository.cancel(uid);
}

export function makeSetOrderStage(repository: OrderRepository) {
  return (uid: string, stage: OrderStage): Promise<Either<AppError, void>> =>
    repository.setStage(uid, stage);
}
