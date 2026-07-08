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
  const [selectedSessionUid, setSelectedSessionUid] = useState<string | null>(
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
          if (sorted.length > 0) {
            setSelectedSessionUid(sorted[0].uid);
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
    if (selectedSessionUid === null) {
      Promise.resolve().then(() => {
        if (!cancelled) setReport(null);
      });
      return () => {
        cancelled = true;
      };
    }
    container.loadSessionReport(selectedSessionUid).then((result) => {
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
  }, [selectedSessionUid, toast]);

  const select = useCallback((uid: string) => {
    setSelectedSessionUid(uid);
  }, []);

  return { sessions, selectedSessionUid, select, report };
}
