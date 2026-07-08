import type { Either } from '../../domain/shared/either';
import { isLeft, left, right } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import {
  BusinessTypeNotSelectedError,
  UnknownBusinessTypeError,
} from '../../domain/errors';
import {
  getBusinessType,
  type BusinessTypeDefinition,
} from '../../domain/business-type/registry';
import type { ConfigRepository } from '../../domain/config/config.repository';

export interface ResolveActiveTypeDeps {
  configRepo: Pick<ConfigRepository, 'read'>;
}

export function makeResolveActiveType(deps: ResolveActiveTypeDeps) {
  return async (): Promise<Either<AppError, BusinessTypeDefinition>> => {
    const config = await deps.configRepo.read();
    if (isLeft(config)) return config;

    const businessTypeId = config.right.businessTypeId;
    if (!businessTypeId) return left(new BusinessTypeNotSelectedError());

    const definition = getBusinessType(businessTypeId);
    if (!definition) return left(new UnknownBusinessTypeError(businessTypeId));

    return right(definition);
  };
}
