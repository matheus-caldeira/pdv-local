import { describe, expect, it } from 'vitest';
import {
  isLeft,
  isRight,
  left,
  right,
  type Either,
} from '../../domain/shared/either';
import {
  ConnectorError,
  type InfrastructureError,
} from '../../infrastructure/errors';
import type { Order, OrderStatus } from '../../domain/order/order.entity';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import { CloseTabUseCase } from './close-tab.usecase';
import { ReopenTabUseCase } from './reopen-tab.usecase';

interface StatusCall {
  status: OrderStatus;
  closedAt?: number;
}

function makeTab(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    uid: 'tab-1',
    businessTypeId: 'scout',
    sessionUid: 'session-1',
    items: [{ name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 }],
    total: 5,
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

interface RepositoryOptions {
  setStatusFails?: boolean;
  findFailsOnFirstCall?: boolean;
  findFailsOnSecondCall?: boolean;
  disappearsAfterSetStatus?: boolean;
}

function makeRepositories(
  order: Order | undefined,
  calls: StatusCall[],
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
        if (options.disappearsAfterSetStatus && findCalls === 2) {
          return right(undefined);
        }
        return right(order);
      },
      async setStatus(_uid: string, status: OrderStatus, closedAt?: number) {
        if (options.setStatusFails) {
          return left(new ConnectorError('Falha ao gravar status'));
        }
        calls.push({ status, closedAt });
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

describe('CloseTabUseCase', () => {
  it('fecha a comanda gravando pending e closedAt', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(makeRepositories(makeTab(), calls)),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isRight(result)).toBe(true);
    expect(calls[0].status).toBe('pending');
    expect(calls[0].closedAt).toBeTypeOf('number');
  });

  it('recusa fechar comanda vazia', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(makeRepositories(makeTab({ items: [], total: 0 }), calls)),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('EMPTY_TAB');
    expect(calls).toHaveLength(0);
  });

  it('recusa quando a comanda não existe', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(makeRepositories(undefined, calls)),
    );

    const result = await useCase.run({ orderUid: 'sumiu' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });

  it('propaga falha ao ler a comanda', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(
        makeRepositories(makeTab(), calls, { findFailsOnFirstCall: true }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('propaga falha ao gravar o status', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(makeRepositories(makeTab(), calls, { setStatusFails: true })),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('propaga falha ao reler a comanda depois de fechar', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(
        makeRepositories(makeTab(), calls, { findFailsOnSecondCall: true }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('recusa quando a comanda some depois de fechar', async () => {
    const calls: StatusCall[] = [];
    const useCase = new CloseTabUseCase(
      makeUow(
        makeRepositories(makeTab(), calls, {
          disappearsAfterSetStatus: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });
});

describe('ReopenTabUseCase', () => {
  it('reabre a comanda limpando o closedAt', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending', closedAt: 10 }), calls),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isRight(result)).toBe(true);
    expect(calls[0].status).toBe('open');
    expect(calls[0].closedAt).toBeUndefined();
  });

  it('recusa reabrir comanda paga', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(makeRepositories(makeTab({ status: 'paid' }), calls)),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_CLOSED');
    expect(calls).toHaveLength(0);
  });

  it('recusa quando a comanda não existe', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(makeRepositories(undefined, calls)),
    );

    const result = await useCase.run({ orderUid: 'sumiu' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });

  it('propaga falha ao ler a comanda', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending' }), calls, {
          findFailsOnFirstCall: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('propaga falha ao gravar o status', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending' }), calls, {
          setStatusFails: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('propaga falha ao reler a comanda depois de reabrir', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending' }), calls, {
          findFailsOnSecondCall: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('DB_CONNECTOR');
  });

  it('recusa quando a comanda some depois de reabrir', async () => {
    const calls: StatusCall[] = [];
    const useCase = new ReopenTabUseCase(
      makeUow(
        makeRepositories(makeTab({ status: 'pending' }), calls, {
          disappearsAfterSetStatus: true,
        }),
      ),
    );

    const result = await useCase.run({ orderUid: 'tab-1' });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_FOUND');
  });
});
