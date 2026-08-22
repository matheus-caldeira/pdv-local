import { useStoredStageSet } from './useStoredStageSet';

const STORAGE_KEY = 'meu-bolso:kds-collapsed-stages';

export function useKdsCollapsedStages() {
  const { has, toggle } = useStoredStageSet(STORAGE_KEY);

  return { isCollapsed: has, toggle };
}
