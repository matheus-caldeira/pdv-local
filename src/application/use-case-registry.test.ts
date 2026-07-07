import { describe, expect, it } from 'vitest';
import { resolveRegisterOrder } from './use-case-registry';
import { RegisterOrderUseCase } from './order/register-order.usecase';
import { ScoutRegisterOrderUseCase } from './order/scout-register-order.usecase';
import { getBusinessType } from '../domain/business-type/registry';
import type { UnitOfWork } from '../domain/shared/unit-of-work';

const uow = {
  run: async () => ({ _tag: 'Right', right: undefined }),
} as unknown as UnitOfWork;

describe('resolveRegisterOrder', () => {
  it("retorna ScoutRegisterOrderUseCase para 'scout'", () => {
    const useCase = resolveRegisterOrder(
      'scout',
      uow,
      getBusinessType('scout')!,
    );
    expect(useCase).toBeInstanceOf(ScoutRegisterOrderUseCase);
  });
  it('retorna o genérico para outro id', () => {
    const useCase = resolveRegisterOrder(
      'quick_sale',
      uow,
      getBusinessType('quick_sale')!,
    );
    expect(useCase).toBeInstanceOf(RegisterOrderUseCase);
    expect(useCase).not.toBeInstanceOf(ScoutRegisterOrderUseCase);
  });
});
