import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { TabNotFoundError } from '../../domain/errors';
import {
  calculateOrderTotal,
  canAddItems,
  diffStockByProduct,
} from '../../domain/order/order.rules';
import type { StockAdjustment } from '../../domain/product/product.repository';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import { UseCase } from '../use-case';

export interface UpdateTabItemsInput {
  orderUid: string;
  items: OrderItem[];
}

const ADJUSTMENTS_KEY = 'stockAdjustments';
const TOTAL_KEY = 'updatedTotal';

export class UpdateTabItemsUseCase extends UseCase<UpdateTabItemsInput, Order> {
  protected async pre(): Promise<Either<AppError, void>> {
    return right(undefined);
  }

  protected async execute(
    input: UpdateTabItemsInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;

    const order = found.right;
    if (!order) return left(new TabNotFoundError());

    const allowed = canAddItems(order);
    if (isLeft(allowed)) return allowed;

    this.context.set(
      ADJUSTMENTS_KEY,
      diffStockByProduct(order.items, input.items),
    );
    this.context.set(TOTAL_KEY, calculateOrderTotal(input.items));
    return right(undefined);
  }

  protected async post(
    input: UpdateTabItemsInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const adjustments = this.context.get<StockAdjustment[]>(
      ADJUSTMENTS_KEY,
    ) as StockAdjustment[];
    const total = this.context.get<number>(TOTAL_KEY) as number;

    const stock = await repositories.products.adjustStock(adjustments);
    if (isLeft(stock)) return stock;

    const replaced = await repositories.orders.replaceItems(
      input.orderUid,
      input.items,
      total,
    );
    if (isLeft(replaced)) return replaced;

    const found = await repositories.orders.findByUid(input.orderUid);
    if (isLeft(found)) return found;
    if (!found.right) return left(new TabNotFoundError());
    return right(found.right);
  }
}
