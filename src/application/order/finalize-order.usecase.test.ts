import { beforeEach, describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type {
  NewOrder,
  Order,
  OrderItem,
} from '../../domain/order/order.entity';
import { EmptyCartError } from '../../domain/errors';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import {
  makeFinalizeOrder,
  type FinalizeOrderInput,
} from './finalize-order.usecase';

class FakeRepositories implements Repositories {
  claimedTicket = false;
  createdOrder: NewOrder | null = null;
  decrements: { productId: number; qty: number }[] = [];
  findOrCreateInput: { phone: string; name: string; address: string } | null =
    null;

  claimTicketResult: Either<InfrastructureError, string> = right('0001');
  findOrCreateResult: Either<InfrastructureError, number | undefined> =
    right(7);
  decrementResult: Either<InfrastructureError, void> = right(undefined);
  createResult: Either<InfrastructureError, Order> | null = null;

  orders = {
    create: async (order: NewOrder) => {
      this.createdOrder = order;
      return this.createResult ?? right({ ...order, id: 99 } as Order);
    },
    listAll: async () => right([] as Order[]),
    listBySession: async () => right([] as Order[]),
    observeBySession: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    observeActiveStages: () => ({
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    markAsPaid: async () => right(undefined),
    cancel: async () => right(undefined),
    setStage: async () => right(undefined),
  };

  cash = {
    findOpenSession: async () => right(undefined),
    listSessions: async () => right([] as never),
    openSession: async () => right(null as never),
    closeSession: async () => right(null as never),
    listMovements: async () => right([] as never),
    addMovement: async () => right(null as never),
  };

  customers = {
    list: async () => right([] as never),
    findByPhone: async () => right(undefined),
    create: async () => right(null as never),
    update: async () => right(null as never),
    remove: async () => right(undefined),
    findOrCreate: async (input: {
      phone: string;
      name: string;
      address: string;
    }) => {
      this.findOrCreateInput = input;
      return this.findOrCreateResult;
    },
  };

  products = {
    list: async () => right([] as never),
    create: async () => right(null as never),
    update: async () => right(null as never),
    remove: async () => right(undefined),
    removeCustomizationGroup: async () => right(undefined),
    decrementStock: async (
      decrements: { productId: number; qty: number }[],
    ) => {
      this.decrements = decrements;
      return this.decrementResult;
    },
  };

  config = {
    read: async () => right(null as never),
    save: async () => right(null as never),
    claimTicket: async () => {
      this.claimedTicket = true;
      return this.claimTicketResult;
    },
  };

  customizations = {
    listGroups: async () => right([] as never),
    listItems: async () => right([] as never),
    createGroup: async () => right(null as never),
    updateGroup: async () => right(null as never),
    removeGroup: async () => right(undefined),
    createItem: async () => right(null as never),
    updateItem: async () => right(null as never),
    removeItem: async () => right(undefined),
  };
}

class FakeUnitOfWork implements UnitOfWork {
  ran = false;
  private readonly repositories: Repositories;

  constructor(repositories: Repositories) {
    this.repositories = repositories;
  }

  async run<A>(
    work: (repositories: Repositories) => Promise<Either<AppError, A>>,
  ): Promise<Either<AppError, A>> {
    this.ran = true;
    return work(this.repositories);
  }
}

const item = (over: Partial<OrderItem> = {}): OrderItem => ({
  productId: 1,
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 8,
  qty: 2,
  ...over,
});

const baseInput = (
  over: Partial<FinalizeOrderInput> = {},
): FinalizeOrderInput => ({
  sessionId: 1,
  items: [item()],
  paymentMethod: 'pix',
  status: 'paid',
  customerName: 'Maria',
  customerPhone: '41999',
  customerAddress: 'Rua A',
  ticket: null,
  ...over,
});

describe('makeFinalizeOrder', () => {
  let repositories: FakeRepositories;
  let uow: FakeUnitOfWork;

  beforeEach(() => {
    repositories = new FakeRepositories();
    uow = new FakeUnitOfWork(repositories);
  });

  it('fails when the cart is empty without touching the transaction', async () => {
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput({ items: [] }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left).toBeInstanceOf(EmptyCartError);
    expect(uow.ran).toBe(false);
  });

  it('creates the order with the calculated total and stage', async () => {
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput());
    expect(isRight(result)).toBe(true);
    expect(repositories.claimedTicket).toBe(true);
    expect(repositories.createdOrder?.total).toBe(40);
    expect(repositories.createdOrder?.stage).toBe('aceito');
    expect(repositories.createdOrder?.ticket).toBe('0001');
    expect(repositories.createdOrder?.customerId).toBe(7);
    expect(repositories.decrements).toEqual([{ productId: 1, qty: 2 }]);
  });

  it('uses the provided ticket without claiming a new one', async () => {
    const finalize = makeFinalizeOrder(uow);
    await finalize(baseInput({ ticket: '0042' }));
    expect(repositories.claimedTicket).toBe(false);
    expect(repositories.createdOrder?.ticket).toBe('0042');
  });

  it('aborts when claiming the ticket fails', async () => {
    repositories.claimTicketResult = left(new ConnectorError('down'));
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput());
    expect(isLeft(result)).toBe(true);
    expect(repositories.createdOrder).toBeNull();
  });

  it('aborts when resolving the customer fails', async () => {
    repositories.findOrCreateResult = left(new ConnectorError('down'));
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput());
    expect(isLeft(result)).toBe(true);
    expect(repositories.createdOrder).toBeNull();
  });

  it('aborts when decrementing stock fails', async () => {
    repositories.decrementResult = left(new ConnectorError('down'));
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput());
    expect(isLeft(result)).toBe(true);
    expect(repositories.createdOrder).toBeNull();
  });

  it('propagates a failure from creating the order', async () => {
    repositories.createResult = left(new ConnectorError('down'));
    const finalize = makeFinalizeOrder(uow);
    const result = await finalize(baseInput());
    expect(isLeft(result)).toBe(true);
  });
});
