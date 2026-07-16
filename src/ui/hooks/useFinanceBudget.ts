import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold, isLeft } from '../../domain/shared/either';
import type { BudgetLineView } from '../../application/finance/budget.usecases';
import type { MonthKey } from '../../domain/finance/finance.entity';
import { useToast } from '../molecules/toast-context';

export function useFinanceBudget(month: MonthKey) {
  const toast = useToast();
  const [lines, setLines] = useState<BudgetLineView[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [loadedMonth, setLoadedMonth] = useState<MonthKey | null>(null);
  const loading = loadedMonth !== month;

  const load = useCallback(
    () =>
      Promise.all([
        container.loadFinanceBudget(month),
        container.listFinanceClosings(),
      ]).then(([budget, closings]) => {
        fold(
          budget,
          (error) => toast(error.message, 'error'),
          (value) => setLines(value),
        );
        fold(
          closings,
          (error) => toast(error.message, 'error'),
          (value) =>
            setIsClosed(value.some((closing) => closing.month === month)),
        );
        setLoadedMonth(month);
      }),
    [month, toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const saveTemplate = useCallback(
    async (categoryUid: string, amount: number) => {
      const result = await container.saveFinanceBudgetTemplateItem(
        categoryUid,
        amount,
      );
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Modelo de orçamento atualizado');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const saveOverride = useCallback(
    async (categoryUid: string, amount: number) => {
      const result = await container.saveFinanceBudgetOverride(
        categoryUid,
        month,
        amount,
      );
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Orçamento do mês atualizado');
          load();
          return true;
        },
      );
    },
    [month, toast, load],
  );

  const removeOverride = useCallback(
    async (categoryUid: string, overrideAmount: number) => {
      const saved = await container.saveFinanceBudgetOverride(
        categoryUid,
        month,
        overrideAmount,
      );
      if (isLeft(saved)) {
        toast(saved.left.message, 'error');
        return false;
      }
      const removed = await container.removeFinanceBudgetItem(saved.right.uid);
      return fold(
        removed,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Ajuste removido, valor do modelo restaurado');
          load();
          return true;
        },
      );
    },
    [month, toast, load],
  );

  return {
    lines,
    isClosed,
    loading,
    load,
    saveTemplate,
    saveOverride,
    removeOverride,
  };
}
