import { left, right, type Either } from '../shared/either';
import {
  LastModuleDisabledError,
  UnknownModuleError,
  type DomainError,
} from '../errors';

export const ALL_MODULE_IDS = ['pdv', 'finance'] as const;

export type ModuleId = (typeof ALL_MODULE_IDS)[number];

export function isModuleId(value: string): value is ModuleId {
  return (ALL_MODULE_IDS as readonly string[]).includes(value);
}

export interface ModulesResolution {
  modules: ModuleId[];
  needsFirstRun: boolean;
  shouldPersist: boolean;
}

export function resolveEnabledModules(
  stored: string[],
  hasSalesData: boolean,
): ModulesResolution {
  const valid = stored.filter(isModuleId);
  if (valid.length > 0) {
    return { modules: valid, needsFirstRun: false, shouldPersist: false };
  }
  if (hasSalesData) {
    return { modules: ['pdv'], needsFirstRun: false, shouldPersist: true };
  }
  return { modules: [], needsFirstRun: true, shouldPersist: false };
}

export function validateModuleSelection(
  selection: string[],
): Either<DomainError, ModuleId[]> {
  const unknown = selection.find((id) => !isModuleId(id));
  if (unknown !== undefined) return left(new UnknownModuleError(unknown));
  const unique = [...new Set(selection)].filter(isModuleId);
  if (unique.length === 0) return left(new LastModuleDisabledError());
  return right(unique);
}
