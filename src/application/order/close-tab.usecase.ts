import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { TabNotFoundError } from '../../domain/errors';
import { canClose } from '../../domain/order/order.rules';
import type { Order } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import { UseCase } from '../use-case';

export interface CloseTabInput {
  orderUid: string;
}

const CLOSED_AT_KEY = 'closedAt';

export class CloseTabUseCase extends UseCase<CloseTabInput, Order> {
  protected async pre(): Promise<Either<AppError, void>> {
    return right(undefined);
  }

  protected async execute(
    input: CloseTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;

    const order = found.right;
    if (!order) return left(new TabNotFoundError());

    const allowed = canClose(order);
    if (isLeft(allowed)) return allowed;

    this.context.set(CLOSED_AT_KEY, Date.now());
    return right(undefined);
  }

  protected async post(
    input: CloseTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const closedAt = this.context.get<number>(CLOSED_AT_KEY) as number;

    const updated = await repositories.orders.setStatus(
      input.orderUid,
      'pending',
      closedAt,
    );
    if (isLeft(updated)) return updated;

    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;
    if (!found.right) return left(new TabNotFoundError());
    return right(found.right);
  }
}
