import { useCallback, useState } from 'react';

const STORAGE_KEY = 'meu-bolso:sidebar-collapsed';

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useSidebarCollapsed(): [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useState(readStored);

  const update = useCallback((value: boolean) => {
    setCollapsed(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      return;
    }
  }, []);

  return [collapsed, update];
}
