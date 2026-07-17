import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { container } from './container';
import { fold } from '../domain/shared/either';
import type { ModuleId } from '../domain/modules/module';
import { useToast } from '../ui/molecules/toast-context';
import { ModulesContext } from './modules-context';

export function ModulesProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [needsFirstRun, setNeedsFirstRun] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof container.resolveModulesState>>) => {
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
    },
    [toast],
  );

  const refresh = useCallback(async () => {
    const result = await container.resolveModulesState();
    applyResult(result);
  }, [applyResult]);

  useEffect(() => {
    let cancelled = false;
    container.resolveModulesState().then((result) => {
      if (cancelled) return;
      applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResult]);

  return (
    <ModulesContext.Provider
      value={{ modules, needsFirstRun, status, refresh }}
    >
      {children}
    </ModulesContext.Provider>
  );
}
