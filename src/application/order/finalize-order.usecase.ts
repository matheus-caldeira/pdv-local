import { isLeft, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type {
  NewOrder,
  Order,
  OrderItem,
  OrderStatus,
} from '../../domain/order/order.entity';
import {
  calculateOrderTotal,
  validateCartNotEmpty,
} from '../../domain/order/order.rules';

export interface FinalizeOrderInput {
  sessionId: number;
  items: OrderItem[];
  paymentMethod: string | null;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  ticket: string | null;
}

export function makeFinalizeOrder(uow: UnitOfWork) {
  return async (
    input: FinalizeOrderInput,
  ): Promise<Either<AppError, Order>> => {
    const validated = validateCartNotEmpty(input.items);
    if (isLeft(validated)) return validated;

    const total = calculateOrderTotal(input.items);

    return uow.run<Order>(async (repositories) => {
      const ticketResult: Either<AppError, string> =
        input.ticket === null
          ? await repositories.config.claimTicket()
          : right(input.ticket);
      if (isLeft(ticketResult)) return ticketResult;

      const customerResult = await repositories.customers.findOrCreate({
        phone: input.customerPhone,
        name: input.customerName,
        address: input.customerAddress,
      });
      if (isLeft(customerResult)) return customerResult;

      const stockResult = await repositories.products.decrementStock(
        input.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
        })),
      );
      if (isLeft(stockResult)) return stockResult;

      const now = Date.now();
      const order: NewOrder = {
        sessionId: input.sessionId,
        items: input.items,
        total,
        paymentMethod: input.paymentMethod,
        customerName: input.customerName.trim(),
        customerId: customerResult.right,
        customerPhone: input.customerPhone.trim(),
        ticket: ticketResult.right,
        status: input.status,
        stage: 'aceito',
        createdAt: now,
        updatedAt: now,
      };

      return repositories.orders.create(order);
    });
  };
}
