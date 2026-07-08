import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { MissingTicketError } from '../../domain/errors';
import { createUid } from '../../domain/shared/uid';
import {
  calculateOrderTotal,
  validateCartNotEmpty,
} from '../../domain/order/order.rules';
import type {
  NewOrder,
  Order,
  OrderItem,
  OrderStatus,
} from '../../domain/order/order.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { UseCase } from '../use-case';

export interface RegisterOrderInput {
  sessionUid: string;
  items: OrderItem[];
  ticket?: string;
  customerUid?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string | null;
  status?: OrderStatus;
  extra?: Record<string, string>;
}

const DRAFT_KEY = 'draftOrder';

export class RegisterOrderUseCase extends UseCase<RegisterOrderInput, Order> {
  private readonly definition: BusinessTypeDefinition;

  constructor(uow: UnitOfWork, definition: BusinessTypeDefinition) {
    super(uow);
    this.definition = definition;
  }

  protected async pre(
    input: RegisterOrderInput,
  ): Promise<Either<AppError, void>> {
    const notEmpty = validateCartNotEmpty(input.items);
    if (isLeft(notEmpty)) return notEmpty;
    if (
      this.definition.rules.ordering === 'required' &&
      !input.ticket?.trim()
    ) {
      return left(new MissingTicketError());
    }
    return right(undefined);
  }

  protected async execute(
    input: RegisterOrderInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const ticketResult = await this.resolveTicket(input, repositories);
    if (isLeft(ticketResult)) return ticketResult;

    const customerResult = await this.resolveCustomer(input, repositories);
    if (isLeft(customerResult)) return customerResult;

    const now = Date.now();
    const draft: NewOrder = {
      uid: createUid(),
      businessTypeId: this.definition.id,
      sessionUid: input.sessionUid,
      customerUid: customerResult.right,
      items: input.items,
      total: calculateOrderTotal(input.items),
      paymentMethod: input.paymentMethod ?? null,
      customerName: input.customerName?.trim() ?? '',
      customerPhone: input.customerPhone?.trim() ?? '',
      ticket: ticketResult.right,
      stage: 'aceito',
      status: input.status ?? 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.context.set(DRAFT_KEY, draft);
    return right(undefined);
  }

  protected async post(
    _input: RegisterOrderInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const draft = this.context.get<NewOrder>(DRAFT_KEY) as NewOrder;

    const stockResult = await repositories.products.decrementStock(
      draft.items
        .filter((item) => item.productUid !== undefined)
        .map((item) => ({
          productUid: item.productUid as string,
          qty: item.qty,
        })),
    );
    if (isLeft(stockResult)) return stockResult;

    return repositories.orders.create(draft);
  }

  private async resolveTicket(
    input: RegisterOrderInput,
    repositories: Repositories,
  ): Promise<Either<AppError, string>> {
    const trimmed = input.ticket?.trim();
    if (trimmed) return right(trimmed);
    if (this.definition.rules.ordering !== 'none') {
      return repositories.config.claimTicket();
    }
    return right('');
  }

  private async resolveCustomer(
    input: RegisterOrderInput,
    repositories: Repositories,
  ): Promise<Either<AppError, string | undefined>> {
    if (input.customerUid) return right(input.customerUid);
    if (!input.customerName && !input.customerPhone) return right(undefined);
    return repositories.customers.findOrCreate({
      phone: input.customerPhone ?? '',
      name: input.customerName ?? '',
      address: input.customerAddress ?? '',
    });
  }
}
