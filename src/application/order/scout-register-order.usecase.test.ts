import { describe, expect, it } from 'vitest';
import { ScoutRegisterOrderUseCase } from './scout-register-order.usecase';
import type { RegisterOrderInput } from './register-order.usecase';
import {
  isLeft,
  isRight,
  right,
  type Either,
} from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type {
  NewOrder,
  Order,
  OrderItem,
} from '../../domain/order/order.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import type { Repositories } from '../../domain/shared/repositories';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';

const scoutDef: BusinessTypeDefinition = {
  id: 'scout',
  rules: { ordering: 'required', payment: 'deferred' },
  fields: { business: [], customer: [] },
};

const items: OrderItem[] = [
  { name: 'Lanche', salePrice: 8, costPrice: 3, qty: 1 },
];

function makeUow(): UnitOfWork {
  const repositories = {
    orders: {
      create: async (order: NewOrder): Promise<Either<AppError, Order>> =>
        right({ ...order, id: 1 }),
    },
    products: {
      adjustStock: async () => right(undefined),
    },
    config: {
      claimTicket: async () => right('0001'),
    },
  } as unknown as Repositories;
  return { run: async (work) => work(repositories) };
}

describe('ScoutRegisterOrderUseCase', () => {
  it('reserva o número da comanda quando nenhum ticket é informado', async () => {
    const result = await new ScoutRegisterOrderUseCase(makeUow(), scoutDef).run(
      {
        sessionUid: 's1',
        items,
      },
    );
    expect(isRight(result)).toBe(true);
  });

  it('exige o par completo quando um dos campos do aluno é informado', async () => {
    const input: RegisterOrderInput = {
      sessionUid: 's1',
      items,
      ticket: '10',
      extra: { section: 'lobinho' },
    };
    const result = await new ScoutRegisterOrderUseCase(makeUow(), scoutDef).run(
      input,
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('INVALID_CUSTOMER');
  });

  it('cria a order sem os campos do aluno (validação relaxada)', async () => {
    const input: RegisterOrderInput = {
      sessionUid: 's1',
      items,
      ticket: '10',
    };
    const result = await new ScoutRegisterOrderUseCase(makeUow(), scoutDef).run(
      input,
    );
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.businessTypeId).toBe('scout');
  });

  it('cria a order via super.post quando extra está completo', async () => {
    const input: RegisterOrderInput = {
      sessionUid: 's1',
      items,
      ticket: '10',
      extra: { section: 'lobinho', guardian: 'Maria' },
    };
    const result = await new ScoutRegisterOrderUseCase(makeUow(), scoutDef).run(
      input,
    );
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.businessTypeId).toBe('scout');
  });
});
