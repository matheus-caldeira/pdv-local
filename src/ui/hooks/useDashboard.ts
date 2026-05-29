import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { DashboardData } from '../../application/report/report.usecases';
import { useToast } from '../molecules/toast-context';

export function useDashboard(sessionId: number | undefined) {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (sessionId === undefined) {
      Promise.resolve().then(() => {
        if (!cancelled) setData(null);
      });
      return () => {
        cancelled = true;
      };
    }
    container.loadDashboard(sessionId).then((result) => {
      if (cancelled) return;
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (value) => setData(value),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, toast]);

  return { data };
}
