import { describe, expect, it } from 'vitest';
import { RegisterOrderUseCase } from './register-order.usecase';
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
  } as unknown as Repositories;
  return { uow: { run: async (work) => work(repositories) }, created };
}

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
});
