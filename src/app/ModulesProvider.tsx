import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { container } from './container';
import { fold } from '../domain/shared/either';
import type { ModuleId } from '../domain/modules/module';
import { useToast } from '../ui/molecules/toast-context';

interface ModulesContextValue {
  modules: ModuleId[];
  needsFirstRun: boolean;
  status: 'loading' | 'ready';
  refresh: () => Promise<void>;
}

const ModulesContext = createContext<ModulesContextValue | null>(null);

export function ModulesProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [needsFirstRun, setNeedsFirstRun] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  const refresh = useCallback(async () => {
    const result = await container.resolveModulesState();
    fold(
      result,
      (error) => {
        toast(error.message, 'error');
        setModules(['pdv']);
        setNeedsFirstRun(false);
      },
      (state) => {
        setModules(state.modules);
        setNeedsFirstRun(state.needsFirstRun);
      },
    );
    setStatus('ready');
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ModulesContext.Provider
      value={{ modules, needsFirstRun, status, refresh }}
    >
      {children}
    </ModulesContext.Provider>
  );
}

export function useModules(): ModulesContextValue {
  const value = useContext(ModulesContext);
  if (value === null) {
    throw new Error('useModules must be used within ModulesProvider');
  }
  return value;
}
