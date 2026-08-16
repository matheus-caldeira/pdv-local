import { describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import { ConnectorError } from '../../infrastructure/errors';
import { InsufficientStockError } from '../../domain/errors';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { AddItemsToTabUseCase } from './add-items-to-tab.usecase';

interface Recorded {
  items: OrderItem[];
  total: number;
}

interface RepositoryOptions {
  stockFails?: boolean;
  replaceFails?: boolean;
  findFailsOnFirstCall?: boolean;
  findFailsOnSecondCall?: boolean;
  disappearsAfterReplace?: boolean;
}

function makeRepositories(
  order: Order | undefined,
  recorded: Recorded[],
  options: RepositoryOptions = {},
): Repositories {
  let findCalls = 0;
  return {
    orders: {
      async findByUid() {
        findCalls += 1;
        if (options.findFailsOnFirstCall && findCalls === 1) {
          return left(new ConnectorError('Falha de leitura'));
        }
        if (options.findFailsOnSecondCall && findCalls === 2) {
          return left(new ConnectorError('Falha de leitura'));
        }
        if (options.disappearsAfterReplace && findCalls === 2) {
          return right(undefined);
        }
        return right(order);
      },
      async replaceItems(_uid: string, items: OrderItem[], total: number) {
        if (options.replaceFails) {
          return left(new ConnectorError('Falha ao gravar itens'));
        }
        recorded.push({ items, total });
        return right(undefined);
      },
    },
    products: {
      async decrementStock() {
        return options.stockFails
          ? left(new InsufficientStockError('Refri'))
          : right(undefined);
      },
    },
  } as unknown as Repositories;
}

function makeUow(repositories: Repositories): UnitOfWork {
  return {
    run: <T>(
      work: (repos: Repositories) => Promise<Either<InfrastructureError, T>>,
    ) => work(repositories),
  } as unknown as UnitOfWork;
}

function makeTab(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 'session-1',
    items: [],
    total: 0,
    paymentMethod: null,
    customerName: 'Maju',
    customerPhone: '',
    ticket: '042',
    stage: 'aceito',
    status: 'open',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('AddItemsToTabUseCase', () => {
  it('lança itens numa comanda aberta e recalcula o total', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(makeTab(), recorded)),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 2 }],
    });

    expect(isRight(result)).toBe(true);
    expect(recorded[0].total).toBe(10);
    expect(recorded[0].items).toHaveLength(1);
  });

  it('agrupa com os itens que já estavam na comanda', async () => {
    const recorded: Recorded[] = [];
    const existing = makeTab({
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
      total: 5,
    });
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(existing, recorded)),
    );

    await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 2 }],
    });

    expect(recorded[0].items).toHaveLength(1);
    expect(recorded[0].items[0].qty).toBe(3);
    expect(recorded[0].total).toBe(15);
  });

  it('recusa lançar em comanda fechada', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(makeTab({ status: 'pending' }), recorded)),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_OPEN');
    expect(recorded).toHaveLength(0);
  });

  it('recusa quando a comanda não existe', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(undefined, recorded)),
    );

    const result = await useCase.run({
      orderUid: 'sumiu',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });

  it('recusa lançamento sem itens', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(makeTab(), recorded)),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('EMPTY_CART');
  });

  it('propaga falha de estoque sem gravar itens', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(makeTab(), recorded, { stockFails: true })),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [
        {
          productUid: 'p-1',
          name: 'Refri',
          salePrice: 5,
          costPrice: 2,
          qty: 1,
        },
      ],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INSUFFICIENT_STOCK');
    expect(recorded).toHaveLength(0);
  });

  it('propaga falha ao ler a comanda', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, {
          findFailsOnFirstCall: true,
        }),
      ),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
    expect(recorded).toHaveLength(0);
  });

  it('propaga falha ao gravar os itens mesclados', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(makeRepositories(makeTab(), recorded, { replaceFails: true })),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
    expect(recorded).toHaveLength(0);
  });

  it('propaga falha ao reler a comanda depois de gravar os itens', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, {
          findFailsOnSecondCall: true,
        }),
      ),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('recusa quando a comanda some depois de gravar os itens', async () => {
    const recorded: Recorded[] = [];
    const useCase = new AddItemsToTabUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, {
          disappearsAfterReplace: true,
        }),
      ),
    );

    const result = await useCase.run({
      orderUid: 'tab-1',
      items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });
});
