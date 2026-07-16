import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { ClosingPreview } from '../../application/finance/closing.usecases';
import type {
  MonthClosing,
  MonthKey,
} from '../../domain/finance/finance.entity';
import { useToast } from '../molecules/toast-context';

export function useFinanceClosings(month: MonthKey) {
  const toast = useToast();
  const [preview, setPreview] = useState<ClosingPreview | null>(null);
  const [closings, setClosings] = useState<MonthClosing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [previewResult, closingsResult] = await Promise.all([
      container.loadFinanceClosingPreview(month),
      container.listFinanceClosings(),
    ]);
    fold(
      previewResult,
      (error) => {
        toast(error.message, 'error');
        setPreview(null);
        setLoading(false);
      },
      (value) => {
        setPreview(value);
        setLoading(false);
      },
    );
    fold(
      closingsResult,
      (error) => toast(error.message, 'error'),
      (value) => setClosings(value),
    );
  }, [month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const closeMonth = useCallback(async () => {
    const result = await container.closeFinanceMonth(month, Date.now());
    return fold(
      result,
      (error) => {
        toast(error.message, 'error');
        return false;
      },
      () => {
        toast('Mês fechado!');
        load();
        return true;
      },
    );
  }, [month, toast, load]);

  const reopenMonth = useCallback(
    async (target: MonthKey) => {
      const result = await container.reopenFinanceMonth(target);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Mês reaberto!');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  return { preview, closings, loading, load, closeMonth, reopenMonth };
}
