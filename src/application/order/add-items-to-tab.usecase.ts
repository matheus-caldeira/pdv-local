import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { TabNotFoundError } from '../../domain/errors';
import {
  calculateOrderTotal,
  canAddItems,
  mergeOrderItems,
  validateCartNotEmpty,
} from '../../domain/order/order.rules';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import { UseCase } from '../use-case';

export interface AddItemsToTabInput {
  orderUid: string;
  items: OrderItem[];
}

const MERGED_KEY = 'mergedItems';
const TOTAL_KEY = 'mergedTotal';

export class AddItemsToTabUseCase extends UseCase<AddItemsToTabInput, Order> {
  protected async pre(
    input: AddItemsToTabInput,
  ): Promise<Either<AppError, void>> {
    return validateCartNotEmpty(input.items);
  }

  protected async execute(
    input: AddItemsToTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;

    const order = found.right;
    if (!order) return left(new TabNotFoundError());

    const allowed = canAddItems(order);
    if (isLeft(allowed)) return allowed;

    const merged = mergeOrderItems(order.items, input.items);
    this.context.set(MERGED_KEY, merged);
    this.context.set(TOTAL_KEY, calculateOrderTotal(merged));
    return right(undefined);
  }

  protected async post(
    input: AddItemsToTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const stock = await repositories.products.adjustStock(
      input.items
        .filter((item) => item.productUid !== undefined)
        .map((item) => ({
          productUid: item.productUid as string,
          qty: item.qty,
        })),
    );
    if (isLeft(stock)) return stock;

    const merged = this.context.get<OrderItem[]>(MERGED_KEY) as OrderItem[];
    const total = this.context.get<number>(TOTAL_KEY) as number;

    const replaced = await repositories.orders.replaceItems(
      input.orderUid,
      merged,
      total,
    );
    if (isLeft(replaced)) return replaced;

    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;
    if (!found.right) return left(new TabNotFoundError());
    return right(found.right);
  }
}
