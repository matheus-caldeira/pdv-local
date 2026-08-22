import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import { InvalidCustomerError } from '../../domain/errors';
import {
  formatTicket,
  shouldClaimTicket,
} from '../../domain/config/config.rules';
import { createUid } from '../../domain/shared/uid';
import type { NewOrder, Order } from '../../domain/order/order.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { UseCase } from '../use-case';

export interface OpenTabInput {
  sessionUid: string;
  customerName: string;
  customerUid?: string;
  ticket?: string;
}

const DRAFT_KEY = 'draftTab';

export class OpenTabUseCase extends UseCase<OpenTabInput, Order> {
  private readonly definition: BusinessTypeDefinition;

  constructor(uow: UnitOfWork, definition: BusinessTypeDefinition) {
    super(uow);
    this.definition = definition;
  }

  protected async pre(input: OpenTabInput): Promise<Either<AppError, void>> {
    if (!input.customerName.trim()) {
      return left(new InvalidCustomerError('Informe o nome para a comanda.'));
    }
    return right(undefined);
  }

  protected async execute(
    input: OpenTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, void>> {
    const ticket = await this.resolveTicket(input, repositories);
    if (isLeft(ticket)) return ticket;

    const customerUid = await this.resolveCustomer(input);
    if (isLeft(customerUid)) return customerUid;

    const now = Date.now();
    const draft: NewOrder = {
      uid: createUid(),
      businessTypeId: this.definition.id,
      sessionUid: input.sessionUid,
      customerUid: customerUid.right,
      items: [],
      total: 0,
      paymentMethod: null,
      customerName: input.customerName.trim(),
      customerPhone: '',
      ticket: ticket.right,
      stage: 'aceito',
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };
    this.context.set(DRAFT_KEY, draft);
    return right(undefined);
  }

  protected async post(
    _input: OpenTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, Order>> {
    const draft = this.context.get<NewOrder>(DRAFT_KEY) as NewOrder;
    return repositories.orders.create(draft);
  }

  private async resolveTicket(
    input: OpenTabInput,
    repositories: Repositories,
  ): Promise<Either<AppError, string>> {
    const config = await repositories.config.read();
    if (isLeft(config)) return config;

    const suggestion = formatTicket(
      config.right.ticketCounter,
      config.right.ticketLimit,
    );

    if (shouldClaimTicket(input.ticket, suggestion)) {
      return repositories.config.claimTicket();
    }
    return right(input.ticket!.trim());
  }

  private async resolveCustomer(
    input: OpenTabInput,
  ): Promise<Either<AppError, string | undefined>> {
    return right(input.customerUid);
  }
}
