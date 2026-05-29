import { useCallback, useEffect, useMemo, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order, OrderStage } from '../../domain/order/order.entity';
import { useToast } from '../molecules/toast-context';

export function useKdsOrders(sessionId: number | undefined) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (sessionId === undefined) return;
    const subscription = container
      .observeSessionOrders(sessionId)
      .subscribe((value) => setOrders(value));
    return () => {
      subscription.unsubscribe();
      setOrders([]);
    };
  }, [sessionId]);

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
    async (id: number, stage: OrderStage) => {
      const result = await container.setOrderStage(id, stage);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => undefined,
      );
    },
    [toast],
  );

  return { orders: activeOrders, byStage, moveStage };
}
