import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null,
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true);
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        interval = setInterval(() => {
          registration.update();
        }, UPDATE_CHECK_INTERVAL_MS);
      },
    });
    updateSWRef.current = updateSW;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    updateSWRef.current?.(true);
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, applyUpdate };
}
