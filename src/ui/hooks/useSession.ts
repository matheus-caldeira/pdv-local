import { useEffect, useState } from 'react';
import { getDatabase } from '../../infrastructure/dexie/provider-registry';
import type { Session } from '../../infrastructure/dexie/dexie-database';

export function useSession() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .sessions.toArray()
      .then((sessions) => {
        if (cancelled) return;
        const open = sessions.find((session) => session.closedAt === null);
        setActiveSession(open ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { activeSession, loading };
}
