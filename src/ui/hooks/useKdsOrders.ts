import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order, OrderStage } from '../../domain/order/order.entity';
import { resolveAutoStage } from '../../domain/order/order.rules';
import { useToast } from '../molecules/toast-context';

export function useKdsOrders(
  sessionUid: string | undefined,
  autoStages: OrderStage[] = [],
) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const movingRef = useRef(new Set<string>());

  useEffect(() => {
    if (sessionUid === undefined) return;
    const subscription = container
      .observeSessionOrders(sessionUid)
      .subscribe((value) => setOrders(value));
    return () => {
      subscription.unsubscribe();
      setOrders([]);
    };
  }, [sessionUid]);

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status !== 'cancelled')
        .sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const byStage = useCallback(
    (stage: OrderStage) =>
      activeOrders.filter((order) => order.stage === stage),
    [activeOrders],
  );

  const moveStage = useCallback(
    async (uid: string, stage: OrderStage) => {
      const result = await container.setOrderStage(uid, stage);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => undefined,
      );
    },
    [toast],
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

  return { orders: activeOrders, byStage, moveStage };
}
