import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { TabNotFoundError } from '../../domain/errors';
import { canReopen } from '../../domain/order/order.rules';
import type { Order } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import { UseCase } from '../use-case';

export interface ReopenTabInput {
  orderUid: string;
}

export class ReopenTabUseCase extends UseCase<ReopenTabInput, Order> {
  protected async pre(): Promise<Either<AppError, void>> {
    return right(undefined);
  }

  protected async execute(
    input: ReopenTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;

    const order = found.right;
    if (!order) return left(new TabNotFoundError());

    return canReopen(order);
  }

  protected async post(
    input: ReopenTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const updated = await repositories.orders.setStatus(
      input.orderUid,
      'open',
      undefined,
    );
    if (isLeft(updated)) return updated;

    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;
    if (!found.right) return left(new TabNotFoundError());
    return right(found.right);
  }
}
