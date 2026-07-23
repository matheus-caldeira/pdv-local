import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold, type Either } from '../../domain/shared/either';
import type { AppError } from '../../domain/shared/errors';
import type { MonthKey } from '../../domain/finance/finance.entity';
import type {
  InvoiceDetail,
  InvoiceHistoryPoint,
} from '../../application/finance/invoices.usecases';
import { useToast } from '../molecules/toast-context';

const HISTORY_MONTHS = 6;

export function useCardInvoices(cardUid: string, month: MonthKey) {
  const toast = useToast();
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [history, setHistory] = useState<InvoiceHistoryPoint[] | null>(null);

  const reportError = useCallback(
    (error: { message: string }) => toast(error.message, 'error'),
    [toast],
  );

  const load = useCallback(async () => {
    const [detailResult, historyResult] = await Promise.all([
      container.getInvoiceDetail(cardUid, month),
      container.listInvoiceHistory(cardUid, HISTORY_MONTHS),
    ]);
    fold(
      detailResult,
      (error) => {
        reportError(error);
        setDetail(null);
      },
      setDetail,
    );
    fold(
      historyResult,
      (error) => {
        reportError(error);
        setHistory([]);
      },
      setHistory,
    );
  }, [cardUid, month, reportError]);

  useEffect(() => {
    if (!cardUid) return;
    load();
  }, [cardUid, load]);

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

  const setAmount = useCallback(
    (amount: number) =>
      runAction(
        container.setInvoiceAmount(cardUid, month, amount),
        'Valor da fatura atualizado',
      ),
    [runAction, cardUid, month],
  );

  const payInvoice = useCallback(
    (paidAt: number) =>
      runAction(container.payInvoice(cardUid, month, paidAt), 'Fatura paga'),
    [runAction, cardUid, month],
  );

  if (!cardUid) {
    return {
      loading: false,
      detail: null,
      history: [] as InvoiceHistoryPoint[],
      setAmount,
      payInvoice,
    };
  }

  return {
    loading: history === null,
    detail,
    history: history ?? [],
    setAmount,
    payInvoice,
  };
}
