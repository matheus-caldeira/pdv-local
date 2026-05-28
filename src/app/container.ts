import { DexieUnitOfWork } from '../infrastructure/dexie/dexie-unit-of-work';
import { getDatabase } from '../infrastructure/dexie/provider-registry';
import {
  makeFinalizeOrder,
  type FinalizeOrderInput,
} from '../application/order/finalize-order.usecase';
import type { Either } from '../domain/shared/either';
import type { AppError } from '../domain/shared/errors';
import type { Order } from '../domain/order/order.entity';

export interface Container {
  finalizeOrder: (
    input: FinalizeOrderInput,
  ) => Promise<Either<AppError, Order>>;
}

export function createContainer(): Container {
  const uow = new DexieUnitOfWork(getDatabase());
  return {
    finalizeOrder: makeFinalizeOrder(uow),
  };
}

export const container = createContainer();
