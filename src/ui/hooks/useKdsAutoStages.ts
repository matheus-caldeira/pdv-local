import { useStoredStageSet } from './useStoredStageSet';

const STORAGE_KEY = 'meu-bolso:kds-auto-stages';

export function useKdsAutoStages() {
  const { stages, has, toggle } = useStoredStageSet(STORAGE_KEY);

  return { autoStages: stages, isAuto: has, toggle };
}
