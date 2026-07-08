import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order } from '../../domain/order/order.entity';
import { useToast } from '../molecules/toast-context';

export function useOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusControlEnabled, setStatusControlEnabled] = useState(false);

  const load = useCallback(async () => {
    const ordersResult = await container.listOrders();
    fold(
      ordersResult,
      (error) => toast(error.message, 'error'),
      (value) => setOrders(value),
    );
    const configResult = await container.readConfig();
    fold(
      configResult,
      (error) => toast(error.message, 'error'),
      (config) => setStatusControlEnabled(config.statusControlEnabled),
    );
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const markPaid = useCallback(
    async (uid: string, paymentMethod: string) => {
      const result = await container.markOrderPaid(uid, paymentMethod);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Pedido marcado como pago');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  const cancel = useCallback(
    async (uid: string) => {
      const result = await container.cancelOrder(uid);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast('Pedido cancelado');
          load();
          return true;
        },
      );
    },
    [toast, load],
  );

  return { orders, statusControlEnabled, load, markPaid, cancel };
}
