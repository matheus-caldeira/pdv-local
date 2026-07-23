import { describe, expect, it } from 'vitest';
import { RegisterOrderUseCase } from './register-order.usecase';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type {
  NewOrder,
  Order,
  OrderItem,
} from '../../domain/order/order.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import {
  FakeCardInvoiceRepository,
  FakeFinanceAutomationRepository,
  FakeFinanceClosingRepository,
  FakeFinanceEntryRepository,
  FakePaymentMethodRepository,
} from '../finance/fakes';

function definitionWith(
  ordering: 'required' | 'optional' | 'none',
): BusinessTypeDefinition {
  return {
    id: 'test',
    rules: { ordering, payment: 'immediate' },
    fields: { business: [], customer: [] },
  };
}

function items(): OrderItem[] {
  return [{ name: 'Café', salePrice: 5, costPrice: 2, qty: 2 }];
}

function makeUow(): { uow: UnitOfWork; created: NewOrder[] } {
  const created: NewOrder[] = [];
  const repositories = {
    orders: {
      create: async (order: NewOrder): Promise<Either<AppError, Order>> => {
        created.push(order);
        return right({ ...order, id: 1 });
      },
    },
    products: {
      decrementStock: async () => right(undefined),
    },
    config: {
      claimTicket: async () => right('0001'),
    },
    customers: {
      findOrCreate: async () => right(undefined),
    },
  } as unknown as Repositories;
  return { uow: { run: async (work) => work(repositories) }, created };
}

class FakeRepositories implements Repositories {
  claimedTicket = false;
  createdOrder: NewOrder | null = null;
  decrements: { productUid: string; qty: number }[] = [];
  findOrCreateInput: { phone: string; name: string; address: string } | null =
    null;

  claimTicketResult: Either<InfrastructureError, string> = right('0001');
  findOrCreateResult: Either<InfrastructureError, string | undefined> =
    right('cust-uid');
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
      decrements: { productUid: string; qty: number }[],
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

  financeEntries = new FakeFinanceEntryRepository();
  financeAutomations = new FakeFinanceAutomationRepository();
  financeClosings = new FakeFinanceClosingRepository();
  financePaymentMethods = new FakePaymentMethodRepository();
  financeCardInvoices = new FakeCardInvoiceRepository();
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

const itemWithProduct = (over: Partial<OrderItem> = {}): OrderItem => ({
  productUid: 'prod-uid-1',
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 8,
  qty: 2,
  ...over,
});

describe('RegisterOrderUseCase', () => {
  it('rejeita MISSING_TICKET quando ordering=required sem ticket', async () => {
    const { uow } = makeUow();
    const result = await new RegisterOrderUseCase(
      uow,
      definitionWith('required'),
    ).run({
      sessionUid: 's1',
      items: items(),
    });
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('MISSING_TICKET');
  });

  it('rejeita EMPTY_CART sem itens', async () => {
    const { uow } = makeUow();
    const result = await new RegisterOrderUseCase(
      uow,
      definitionWith('none'),
    ).run({
      sessionUid: 's1',
      items: [],
    });
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('EMPTY_CART');
  });

  it('cria order com uid, businessTypeId, sessionUid e total quando há ticket', async () => {
    const { uow, created } = makeUow();
    const result = await new RegisterOrderUseCase(
      uow,
      definitionWith('required'),
    ).run({
      sessionUid: 's1',
      items: items(),
      ticket: '007',
    });
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.businessTypeId).toBe('test');
      expect(result.right.sessionUid).toBe('s1');
      expect(result.right.ticket).toBe('007');
      expect(result.right.uid).toBeTruthy();
      expect(result.right.total).toBe(10);
    }
    expect(created).toHaveLength(1);
  });

  it('dispensa ticket quando ordering=none', async () => {
    const { uow } = makeUow();
    const result = await new RegisterOrderUseCase(
      uow,
      definitionWith('none'),
    ).run({
      sessionUid: 's1',
      items: items(),
    });
    expect(isRight(result)).toBe(true);
  });

  describe('semântica completa de venda', () => {
    let repositories: FakeRepositories;
    let uow: FakeUnitOfWork;

    const setup = () => {
      repositories = new FakeRepositories();
      uow = new FakeUnitOfWork(repositories);
      return { repositories, uow };
    };

    it('reivindica ticket automaticamente quando vazio e ordering !== none', async () => {
      const { repositories, uow } = setup();
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('optional'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
      });
      expect(isRight(result)).toBe(true);
      expect(repositories.claimedTicket).toBe(true);
      if (isRight(result)) expect(result.right.ticket).toBe('0001');
      expect(repositories.createdOrder?.ticket).toBe('0001');
    });

    it('não reivindica ticket quando ordering=none', async () => {
      const { repositories, uow } = setup();
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
      });
      expect(isRight(result)).toBe(true);
      expect(repositories.claimedTicket).toBe(false);
      expect(repositories.createdOrder?.ticket).toBe('');
    });

    it('faz upsert do cliente quando nome/telefone são informados', async () => {
      const { repositories, uow } = setup();
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
        customerName: 'Maria',
        customerPhone: '41999',
        customerAddress: 'Rua A',
      });
      expect(isRight(result)).toBe(true);
      expect(repositories.findOrCreateInput).toEqual({
        phone: '41999',
        name: 'Maria',
        address: 'Rua A',
      });
      expect(repositories.createdOrder?.customerUid).toBe('cust-uid');
    });

    it('decrementa estoque para itens com productUid', async () => {
      const { repositories, uow } = setup();
      await new RegisterOrderUseCase(uow, definitionWith('none')).run({
        sessionUid: 's1',
        items: [
          itemWithProduct(),
          { name: 'Sem estoque', salePrice: 3, costPrice: 1, qty: 1 },
        ],
      });
      expect(repositories.decrements).toEqual([
        { productUid: 'prod-uid-1', qty: 2 },
      ]);
    });

    it('aborta quando reivindicar o ticket falha', async () => {
      const { repositories, uow } = setup();
      repositories.claimTicketResult = left(new ConnectorError('down'));
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('optional'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
      });
      expect(isLeft(result)).toBe(true);
      expect(repositories.createdOrder).toBeNull();
    });

    it('usa o customerUid informado sem consultar findOrCreate', async () => {
      const { repositories, uow } = setup();
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
        customerUid: 'cust-existing',
      });
      expect(isRight(result)).toBe(true);
      expect(repositories.findOrCreateInput).toBeNull();
      expect(repositories.createdOrder?.customerUid).toBe('cust-existing');
    });

    it('faz upsert do cliente usando apenas o telefone quando não há nome', async () => {
      const { repositories, uow } = setup();
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
        customerPhone: '41999',
      });
      expect(isRight(result)).toBe(true);
      expect(repositories.findOrCreateInput).toEqual({
        phone: '41999',
        name: '',
        address: '',
      });
    });

    it('aborta quando o upsert do cliente falha', async () => {
      const { repositories, uow } = setup();
      repositories.findOrCreateResult = left(new ConnectorError('down'));
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
        customerName: 'Maria',
      });
      expect(isLeft(result)).toBe(true);
      expect(repositories.createdOrder).toBeNull();
    });

    it('aborta quando decrementar o estoque falha', async () => {
      const { repositories, uow } = setup();
      repositories.decrementResult = left(new ConnectorError('down'));
      const result = await new RegisterOrderUseCase(
        uow,
        definitionWith('none'),
      ).run({
        sessionUid: 's1',
        items: [itemWithProduct()],
      });
      expect(isLeft(result)).toBe(true);
      expect(repositories.createdOrder).toBeNull();
    });
  });
});
