import { isLeft, left, right, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { ConfigRepository } from '../../domain/config/config.repository';
import type { OrderRepository } from '../../domain/order/order.repository';
import type { CashRepository } from '../../domain/cash/cash.repository';
import {
  resolveEnabledModules,
  validateModuleSelection,
  type ModuleId,
} from '../../domain/modules/module';
import {
  BusinessTypeNotSelectedError,
  UnknownBusinessTypeError,
} from '../../domain/errors';
import { getBusinessType } from '../../domain/business-type/registry';

export interface ModulesState {
  modules: ModuleId[];
  needsFirstRun: boolean;
}

export interface ResolveModulesStateDeps {
  configRepo: Pick<ConfigRepository, 'read' | 'save'>;
  orderRepo: Pick<OrderRepository, 'listAll'>;
  cashRepo: Pick<CashRepository, 'listSessions'>;
}

export function makeResolveModulesState(deps: ResolveModulesStateDeps) {
  return async (): Promise<Either<AppError, ModulesState>> => {
    const config = await deps.configRepo.read();
    if (isLeft(config)) return config;

    const stored = config.right.enabledModules;
    const storedResolution = resolveEnabledModules(stored, false);
    if (storedResolution.modules.length > 0) {
      return right({
        modules: storedResolution.modules,
        needsFirstRun: false,
      });
    }

    const orders = await deps.orderRepo.listAll();
    if (isLeft(orders)) return orders;
    const sessions = await deps.cashRepo.listSessions();
    if (isLeft(sessions)) return sessions;

    const hasSalesData = orders.right.length > 0 || sessions.right.length > 0;
    const resolution = resolveEnabledModules(stored, hasSalesData);
    if (resolution.shouldPersist) {
      const saved = await deps.configRepo.save({
        enabledModules: resolution.modules,
      });
      if (isLeft(saved)) return saved;
    }
    return right({
      modules: resolution.modules,
      needsFirstRun: resolution.needsFirstRun,
    });
  };
}

export function makeSaveEnabledModules(
  configRepo: Pick<ConfigRepository, 'save'>,
) {
  return async (selection: string[]): Promise<Either<AppError, ModuleId[]>> => {
    const validated = validateModuleSelection(selection);
    if (isLeft(validated)) return validated;
    const saved = await configRepo.save({ enabledModules: validated.right });
    if (isLeft(saved)) return saved;
    return right(validated.right);
  };
}

export interface FirstRunInput {
  modules: string[];
  businessTypeId?: string;
}

export function makeCompleteFirstRun(
  configRepo: Pick<ConfigRepository, 'save'>,
) {
  return async (
    input: FirstRunInput,
  ): Promise<Either<AppError, ModuleId[]>> => {
    const validated = validateModuleSelection(input.modules);
    if (isLeft(validated)) return validated;

    const patch: { enabledModules: ModuleId[]; businessTypeId?: string } = {
      enabledModules: validated.right,
    };
    if (validated.right.includes('pdv')) {
      if (!input.businessTypeId) {
        return left(new BusinessTypeNotSelectedError());
      }
      if (!getBusinessType(input.businessTypeId)) {
        return left(new UnknownBusinessTypeError(input.businessTypeId));
      }
      patch.businessTypeId = input.businessTypeId;
    }
    const saved = await configRepo.save(patch);
    if (isLeft(saved)) return saved;
    return right(validated.right);
  };
}
