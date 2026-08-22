import { describe, expect, it } from 'vitest';
import { isRight, left, right, type Either } from '../../domain/shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import { TicketLimitReachedError } from '../../domain/errors';
import { ConnectorError } from '../../infrastructure/errors';
import type { NewOrder, Order } from '../../domain/order/order.entity';
import type { BusinessConfig } from '../../domain/config/config.entity';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import { OpenTabUseCase } from './open-tab.usecase';

const scout: BusinessTypeDefinition = {
  id: 'scout',
  rules: { ordering: 'required', payment: 'deferred' },
  fields: { business: [], customer: [] },
};

function makeRepositories(
  created: NewOrder[],
  options: {
    ticketFails?: boolean;
    configReadFails?: boolean;
    claims?: number[];
    suggestion?: string;
  } = {},
): Repositories {
  const suggestion = options.suggestion ?? '042';
  return {
    orders: {
      async create(order: NewOrder) {
        created.push(order);
        return right({ ...order, id: 1 } as Order);
      },
    },
    config: {
      async read() {
        return options.configReadFails
          ? left(new ConnectorError('Falha ao ler configuração.'))
          : right({
              ticketCounter: Number(suggestion),
              ticketLimit: 10 ** suggestion.length - 1,
            } as BusinessConfig);
      },
      async claimTicket() {
        options.claims?.push(1);
        return options.ticketFails
          ? left(new TicketLimitReachedError())
          : right(suggestion);
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

describe('OpenTabUseCase', () => {
  it('abre comanda sem itens', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju (Lobinha)',
    });

    expect(isRight(result)).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].items).toEqual([]);
    expect(created[0].total).toBe(0);
    expect(created[0].status).toBe('open');
  });

  it('usa a sequência automática quando não informam a comanda', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    await useCase.run({ sessionUid: 'session-1', customerName: 'Maju' });

    expect(created[0].ticket).toBe('042');
  });

  it('respeita o número informado manualmente', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
      ticket: '077',
    });

    expect(created[0].ticket).toBe('077');
  });

  it('vincula o cliente informado', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
      customerUid: 'customer-9',
    });

    expect(created[0].customerUid).toBe('customer-9');
  });

  it('recusa abrir comanda sem nome', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: '   ',
    });

    expect(isRight(result)).toBe(false);
    if (!isRight(result)) expect(result.left.code).toBe('INVALID_CUSTOMER');
    expect(created).toHaveLength(0);
  });

  it('propaga falha ao resolver a comanda automaticamente', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created, { ticketFails: true })),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
    });

    expect(isRight(result)).toBe(false);
    if (!isRight(result)) expect(result.left.code).toBe('TICKET_LIMIT_REACHED');
    expect(created).toHaveLength(0);
  });

  it('propaga falha ao ler a configuração para sugerir a comanda', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created, { configReadFails: true })),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
    });

    expect(isRight(result)).toBe(false);
    if (!isRight(result)) expect(result.left.code).toBe('DB_CONNECTOR');
    expect(created).toHaveLength(0);
  });

  it('não vincula cliente quando nenhum uid é informado', async () => {
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created)),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
    });

    expect(isRight(result)).toBe(true);
    expect(created[0].customerUid).toBeUndefined();
    expect(created[0].customerName).toBe('Maju');
  });

  it('avança o contador quando nenhum ticket é informado', async () => {
    const claims: number[] = [];
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created, { claims })),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
    });

    expect(isRight(result)).toBe(true);
    expect(claims).toHaveLength(1);
  });

  it('avança o contador quando o ticket informado é igual à sugestão', async () => {
    const claims: number[] = [];
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created, { claims, suggestion: '0001' })),
      scout,
    );

    await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
      ticket: '0001',
    });

    expect(claims).toHaveLength(1);
  });

  it('não avança o contador quando o usuário digita outro número', async () => {
    const claims: number[] = [];
    const created: NewOrder[] = [];
    const useCase = new OpenTabUseCase(
      makeUow(makeRepositories(created, { claims, suggestion: '0001' })),
      scout,
    );

    const result = await useCase.run({
      sessionUid: 'session-1',
      customerName: 'Maju',
      ticket: '42',
    });

    expect(isRight(result)).toBe(true);
    expect(claims).toHaveLength(0);
  });
});
