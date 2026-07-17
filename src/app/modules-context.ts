import { createContext, useContext } from 'react';
import type { ModuleId } from '../domain/modules/module';

export interface ModulesContextValue {
  modules: ModuleId[];
  needsFirstRun: boolean;
  status: 'loading' | 'ready';
  refresh: () => Promise<void>;
}

export const ModulesContext = createContext<ModulesContextValue | null>(null);

export function useModules(): ModulesContextValue {
  const value = useContext(ModulesContext);
  if (value === null) {
    throw new Error('useModules must be used within ModulesProvider');
  }
  return value;
}
