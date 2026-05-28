import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';
import { useToast } from '../molecules/toast-context';

function sortByRecent(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.openedAt - a.openedAt);
}

export function useReports() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [report, setReport] = useState<SessionReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    container.listReportSessions().then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (value) => {
          const sorted = sortByRecent(value);
          setSessions(sorted);
          if (sorted.length > 0 && sorted[0].id !== undefined) {
            setSelectedSessionId(sorted[0].id);
          }
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (selectedSessionId === null) {
      Promise.resolve().then(() => {
        if (!cancelled) setReport(null);
      });
      return () => {
        cancelled = true;
      };
    }
    container.loadSessionReport(selectedSessionId).then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (value) => setReport(value),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, toast]);

  const select = useCallback((id: number) => {
    setSelectedSessionId(id);
  }, []);

  return { sessions, selectedSessionId, select, report };
}
