import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';

const MOBILE_QUERY = '(max-width: 767px)';

type LayoutPreference = 'auto' | 'mobile' | 'desktop';

function matchesMobile(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  const [preference, setPreference] = useState<LayoutPreference>('auto');
  const [narrowScreen, setNarrowScreen] = useState(matchesMobile);

  useEffect(() => {
    let cancelled = false;
    container.readConfig().then((result) => {
      if (cancelled) return;
      fold(
        result,
        () => undefined,
        (config) => setPreference(config.layoutMode),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(MOBILE_QUERY);
    const sync = (event: { matches: boolean }) =>
      setNarrowScreen(event.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (preference === 'mobile') return true;
  if (preference === 'desktop') return false;
  return narrowScreen;
}
