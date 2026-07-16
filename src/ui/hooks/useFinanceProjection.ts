import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type {
  ProjectionPoint,
  ProjectionSource,
} from '../../domain/finance/finance.rules';
import { useToast } from '../molecules/toast-context';

export type ProjectionMonthCount = 3 | 6 | 12;

export interface FinanceProjectionState {
  points: ProjectionPoint[];
  months: ProjectionMonthCount;
  setMonths(months: ProjectionMonthCount): void;
  source: ProjectionSource;
  setSource(source: ProjectionSource): void;
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
}

export function useFinanceProjection(): FinanceProjectionState {
  const toast = useToast();
  const [months, setMonths] = useState<ProjectionMonthCount>(6);
  const [source, setSource] = useState<ProjectionSource>('both');
  const [points, setPoints] = useState<ProjectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await container.loadFinanceProjection({
      months,
      source,
      nowMs: Date.now(),
    });
    fold(
      result,
      (loadError) => {
        setPoints([]);
        setError(loadError.message);
        setLoading(false);
        toast(loadError.message, 'error');
      },
      (value) => {
        setError(null);
        setPoints(value);
        setLoading(false);
      },
    );
  }, [months, source, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const changeMonths = useCallback((value: ProjectionMonthCount) => {
    setLoading(true);
    setMonths(value);
  }, []);

  const changeSource = useCallback((value: ProjectionSource) => {
    setLoading(true);
    setSource(value);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  return {
    points,
    months,
    setMonths: changeMonths,
    source,
    setSource: changeSource,
    loading,
    error,
    reload,
  };
}
