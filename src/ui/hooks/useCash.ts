import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { CashSummary } from '../../application/cash/cash.usecases';
import type { CashMovementType } from '../../domain/cash/cash.entity';
import { useToast } from '../molecules/toast-context';

interface MovementInput {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export function useCash() {
  const toast = useToast();
  const [summary, setSummary] = useState<CashSummary | null>(null);

  const load = useCallback(async () => {
    const result = await container.loadCashSummary();
    fold(
      result,
      (error) => toast(error.message, 'error'),
      (value) => setSummary(value),
    );
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openSession = useCallback(
    async (cashInitial: number) => {
      const result = await container.openSession(cashInitial);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Caixa aberto!');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const closeSession = useCallback(
    async (cashFinal: number, notes: string) => {
      const result = await container.closeSession(cashFinal, notes);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Caixa fechado!');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const addMovement = useCallback(
    async (input: MovementInput) => {
      const result = await container.addCashMovement(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(
            input.type === 'sangria'
              ? 'Sangria registrada'
              : 'Suprimento registrado',
          );
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  return { summary, load, openSession, closeSession, addMovement };
}
