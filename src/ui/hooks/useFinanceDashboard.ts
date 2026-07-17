import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { FinanceDashboard } from '../../application/finance/dashboard.usecases';
import type {
  EntryStatus,
  MonthKey,
} from '../../domain/finance/finance.entity';
import { useToast } from '../molecules/toast-context';

export function useFinanceDashboard(month: MonthKey) {
  const toast = useToast();
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await container.loadFinanceDashboard(month, Date.now());
    fold(
      result,
      (error) => {
        toast(error.message, 'error');
        setLoading(false);
      },
      (value) => {
        setDashboard(value);
        setLoading(false);
      },
    );
  }, [month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setEntryStatus = useCallback(
    async (uid: string, status: EntryStatus) => {
      const result = await container.setFinanceEntryStatus(uid, status);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {
          toast(
            status === 'paid'
              ? 'Lançamento marcado como pago'
              : 'Pagamento desfeito',
          );
          load();
        },
      );
    },
    [toast, load],
  );

  return { dashboard, loading, setEntryStatus };
}
