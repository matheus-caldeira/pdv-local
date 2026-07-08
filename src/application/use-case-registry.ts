import type { Order } from '../domain/order/order.entity';
import type { BusinessTypeDefinition } from '../domain/business-type/registry';
import type { UnitOfWork } from '../domain/shared/unit-of-work';
import type { UseCase } from './use-case';
import {
  RegisterOrderUseCase,
  type RegisterOrderInput,
} from './order/register-order.usecase';
import { ScoutRegisterOrderUseCase } from './order/scout-register-order.usecase';

export function resolveRegisterOrder(
  businessTypeId: string,
  uow: UnitOfWork,
  definition: BusinessTypeDefinition,
): UseCase<RegisterOrderInput, Order> {
  if (businessTypeId === 'scout') {
    return new ScoutRegisterOrderUseCase(uow, definition);
  }
  return new RegisterOrderUseCase(uow, definition);
}
