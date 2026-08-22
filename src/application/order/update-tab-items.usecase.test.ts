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
import type { StockAdjustment } from '../../domain/product/product.repository';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { UpdateTabItemsUseCase } from './update-tab-items.usecase';

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
  adjustments: StockAdjustment[][],
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
      async adjustStock(entries: StockAdjustment[]) {
        if (options.stockFails) {
          return left(new InsufficientStockError('Refri'));
        }
        adjustments.push(entries);
        return right(undefined);
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
    items: [
      { productUid: 'p-1', name: 'Refri', salePrice: 5, costPrice: 2, qty: 3 },
    ],
    total: 15,
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

describe('UpdateTabItemsUseCase', () => {
  it('reduz a quantidade e devolve a diferença ao estoque', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(makeRepositories(makeTab(), recorded, adjustments)),
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

    expect(isRight(result)).toBe(true);
    expect(adjustments[0]).toEqual([{ productUid: 'p-1', qty: -2 }]);
    expect(recorded[0].total).toBe(5);
  });

  it('aumenta a quantidade e retira a diferença do estoque', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(makeRepositories(makeTab(), recorded, adjustments)),
    );

    await useCase.run({
      orderUid: 'tab-1',
      items: [
        {
          productUid: 'p-1',
          name: 'Refri',
          salePrice: 5,
          costPrice: 2,
          qty: 5,
        },
      ],
    });

    expect(adjustments[0]).toEqual([{ productUid: 'p-1', qty: 2 }]);
    expect(recorded[0].total).toBe(25);
  });

  it('permite esvaziar a comanda devolvendo tudo ao estoque', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(makeRepositories(makeTab(), recorded, adjustments)),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isRight(result)).toBe(true);
    expect(adjustments[0]).toEqual([{ productUid: 'p-1', qty: -3 }]);
    expect(recorded[0].items).toEqual([]);
    expect(recorded[0].total).toBe(0);
  });

  it('recusa editar comanda que não está aberta', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending' }), recorded, adjustments),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_OPEN');
    expect(recorded).toHaveLength(0);
  });

  it('recusa quando a comanda não existe', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(makeRepositories(undefined, recorded, adjustments)),
    );

    const result = await useCase.run({ orderUid: 'sumiu', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });

  it('propaga falha de estoque sem gravar itens', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, adjustments, {
          stockFails: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INSUFFICIENT_STOCK');
    expect(recorded).toHaveLength(0);
  });

  it('propaga falha ao gravar os itens', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, adjustments, {
          replaceFails: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('propaga falha ao ler a comanda', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, adjustments, {
          findFailsOnFirstCall: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
    expect(recorded).toHaveLength(0);
  });

  it('propaga falha ao reler a comanda depois de gravar os itens', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, adjustments, {
          findFailsOnSecondCall: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('recusa quando a comanda some depois de gravar os itens', async () => {
    const recorded: Recorded[] = [];
    const adjustments: StockAdjustment[][] = [];
    const useCase = new UpdateTabItemsUseCase(
      makeUow(
        makeRepositories(makeTab(), recorded, adjustments, {
          disappearsAfterReplace: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1', items: [] });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });
});
