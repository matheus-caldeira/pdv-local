import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Session } from '../../domain/cash/cash.entity';

export function useSession() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    container.getActiveSession().then((result) => {
      if (cancelled) return;
      fold(
        result,
        () => setActiveSession(null),
        (session) => setActiveSession(session),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { activeSession, loading };
}
