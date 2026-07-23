import { useCallback, useEffect, useMemo, useState } from 'react';
import { container } from '../../app/container';
import { fold, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { PaymentMethod } from '../../domain/finance/payment-method.entity';
import type { PaymentMethodInput } from '../../application/finance/payment-methods.usecases';
import { useToast } from '../molecules/toast-context';

export function usePaymentMethods() {
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);

  const reportError = useCallback(
    (error: { message: string }) => toast(error.message, 'error'),
    [toast],
  );

  const load = useCallback(async () => {
    const result = await container.listPaymentMethods();
    fold(
      result,
      (error) => {
        reportError(error);
        setMethods([]);
      },
      setMethods,
    );
  }, [reportError]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = useCallback(
    async <A>(
      action: Promise<Either<AppError, A>>,
      successMessage: string,
    ): Promise<boolean> => {
      const result = await action;
      return fold(
        result,
        (error) => {
          reportError(error);
          return false;
        },
        () => {
          toast(successMessage);
          load();
          return true;
        },
      );
    },
    [reportError, toast, load],
  );

  const createMethod = useCallback(
    (input: PaymentMethodInput) =>
      runAction(
        container.createPaymentMethod(input),
        'Meio de pagamento criado',
      ),
    [runAction],
  );

  const updateMethod = useCallback(
    (uid: string, input: PaymentMethodInput) =>
      runAction(
        container.updatePaymentMethod(uid, input),
        'Meio de pagamento atualizado',
      ),
    [runAction],
  );

  const archiveMethod = useCallback(
    (uid: string) =>
      runAction(
        container.archivePaymentMethod(uid),
        'Meio de pagamento removido',
      ),
    [runAction],
  );

  const loading = methods === null;
  const resolvedMethods = useMemo(() => methods ?? [], [methods]);
  const creditCards = useMemo(
    () =>
      resolvedMethods.filter(
        (method) => method.type === 'credit' && !method.archived,
      ),
    [resolvedMethods],
  );

  return {
    loading,
    methods: resolvedMethods,
    creditCards,
    createMethod,
    updateMethod,
    archiveMethod,
  };
}
