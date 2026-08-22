import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order, OrderStage } from '../../domain/order/order.entity';
import { resolveAutoStage } from '../../domain/order/order.rules';
import { useToast } from '../molecules/toast-context';

export const KDS_FINISHED_PAGE_SIZE = 20;

export function useKdsOrders(
  sessionUid: string | undefined,
  autoStages: OrderStage[] = [],
) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [finished, setFinished] = useState<Order[]>([]);
  const [finishedTotal, setFinishedTotal] = useState(0);
  const [finishedHasMore, setFinishedHasMore] = useState(false);
  const [finishedLoading, setFinishedLoading] = useState(false);
  const movingRef = useRef(new Set<string>());
  const finishedOffsetRef = useRef(0);
  const finishedLoadingRef = useRef(false);

  useEffect(() => {
    if (sessionUid === undefined) return;
    const subscription = container
      .observeActiveSessionOrders(sessionUid)
      .subscribe((value) => setOrders(value));
    return () => {
      subscription.unsubscribe();
      setOrders([]);
    };
  }, [sessionUid]);

  const fetchFinished = useCallback(
    async (offset: number) => {
      if (sessionUid === undefined) return;
      const result = await container.listFinishedOrderPage(
        sessionUid,
        offset,
        KDS_FINISHED_PAGE_SIZE,
      );
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (page) => {
          setFinished((current) =>
            offset === 0 ? page.orders : [...current, ...page.orders],
          );
          setFinishedTotal(page.total);
          setFinishedHasMore(page.hasMore);
          finishedOffsetRef.current = offset + page.orders.length;
        },
      );
    },
    [sessionUid, toast],
  );

  useEffect(() => {
    finishedOffsetRef.current = 0;
    void fetchFinished(0);
    return () => {
      setFinished([]);
      setFinishedTotal(0);
      setFinishedHasMore(false);
    };
  }, [fetchFinished]);

  const loadMoreFinished = useCallback(() => {
    if (finishedLoadingRef.current || !finishedHasMore) return;
    finishedLoadingRef.current = true;
    setFinishedLoading(true);
    void fetchFinished(finishedOffsetRef.current).finally(() => {
      finishedLoadingRef.current = false;
      setFinishedLoading(false);
    });
  }, [finishedHasMore, fetchFinished]);

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'cancelled')
        .sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const byStage = useCallback(
    (stage: OrderStage) =>
      stage === 'finalizado'
        ? finished
        : activeOrders.filter((order) => order.stage === stage),
    [activeOrders, finished],
  );

  const moveStage = useCallback(
    async (uid: string, stage: OrderStage) => {
      const result = await container.setOrderStage(uid, stage);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {
          finishedOffsetRef.current = 0;
          void fetchFinished(0);
        },
      );
    },
    [toast, fetchFinished],
  );

  const autoKey = autoStages.join(',');

  useEffect(() => {
    const stages = autoKey ? (autoKey.split(',') as OrderStage[]) : [];
    if (stages.length === 0) return;

    for (const order of activeOrders) {
      const target = resolveAutoStage(order.stage, stages);
      if (target === null) continue;

      const pending = `${order.uid}:${target}`;
      if (movingRef.current.has(pending)) continue;
      movingRef.current.add(pending);

      void moveStage(order.uid, target).finally(() => {
        movingRef.current.delete(pending);
      });
    }
  }, [activeOrders, autoKey, moveStage]);

  return {
    orders: activeOrders,
    byStage,
    moveStage,
    finished,
    finishedTotal,
    finishedHasMore,
    finishedLoading,
    loadMoreFinished,
  };
}
