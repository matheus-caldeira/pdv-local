import type { Either } from '../../domain/shared/either';
import { isLeft, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
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
    return validateCartNotEmpty(input.items);
  }

  protected async execute(
    input: RegisterOrderInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const ticketResult = await this.resolveTicket(input, repositories);
    if (isLeft(ticketResult)) return ticketResult;

    const customerUid = await this.resolveCustomer(input);

    const now = Date.now();
    const draft: NewOrder = {
      uid: createUid(),
      businessTypeId: this.definition.id,
      sessionUid: input.sessionUid,
      customerUid,
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

    const stockResult = await repositories.products.adjustStock(
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
  ): Promise<string | undefined> {
    return input.customerUid;
  }
}
