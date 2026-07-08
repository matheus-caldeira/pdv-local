import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { DashboardData } from '../../application/report/report.usecases';
import { useToast } from '../molecules/toast-context';

export function useDashboard(sessionUid: string | undefined) {
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (sessionUid === undefined) {
      Promise.resolve().then(() => {
        if (!cancelled) setData(null);
      });
      return () => {
        cancelled = true;
      };
    }
    container.loadDashboard(sessionUid).then((result) => {
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
  }, [sessionUid, toast]);

  return { data };
}
