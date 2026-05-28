import { useState, useEffect, useCallback } from 'react';
import { db, type Session } from '../db/database';

export function useSession() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = await db.sessions.where('closedAt').equals(0).first();
    // Dexie stores null as 0 in indexed fields, check for null too
    if (session) {
      setActiveSession(
        session.closedAt === null || session.closedAt === 0 ? session : null,
      );
    } else {
      // Try finding sessions with null closedAt
      const all = await db.sessions.toArray();
      const open = all.find((s) => s.closedAt === null);
      setActiveSession(open || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openSession = useCallback(
    async (cashInitial: number) => {
      const id = await db.sessions.add({
        openedAt: Date.now(),
        closedAt: null,
        cashInitial,
        cashFinal: null,
        notes: '',
      });
      await refresh();
      return id;
    },
    [refresh],
  );

  const closeSession = useCallback(
    async (cashFinal: number, notes: string = '') => {
      if (!activeSession?.id) return;
      await db.sessions.update(activeSession.id, {
        closedAt: Date.now(),
        cashFinal,
        notes,
      });
      await refresh();
    },
    [activeSession, refresh],
  );

  return { activeSession, loading, openSession, closeSession, refresh };
}
