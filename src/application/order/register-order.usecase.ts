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
  paymentMethod?: string | null;
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
  ): Promise<Either<AppError, void>> {
    const now = Date.now();
    const draft: NewOrder = {
      uid: createUid(),
      businessTypeId: this.definition.id,
      sessionUid: input.sessionUid,
      customerUid: input.customerUid,
      items: input.items,
      total: calculateOrderTotal(input.items),
      paymentMethod: input.paymentMethod ?? null,
      customerName: input.customerName?.trim() ?? '',
      customerPhone: input.customerPhone?.trim() ?? '',
      ticket: input.ticket?.trim() ?? '',
      stage: 'aceito',
      status: 'open',
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
    return repositories.orders.create(draft);
  }
}
