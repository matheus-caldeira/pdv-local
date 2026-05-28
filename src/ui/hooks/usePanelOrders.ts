import { useEffect, useMemo, useState } from 'react';
import { container } from '../../app/container';
import type { Order } from '../../domain/order/order.entity';

export function usePanelOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const subscription = container
      .observeActiveOrders()
      .subscribe((value) => setOrders(value));
    return () => subscription.unsubscribe();
  }, []);

  const preparing = useMemo(
    () =>
      orders
        .filter(
          (order) => order.stage === 'aceito' || order.stage === 'em_preparo',
        )
        .sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  const onTheWay = useMemo(
    () =>
      orders
        .filter((order) => order.stage === 'a_caminho')
        .sort((a, b) => a.createdAt - b.createdAt),
    [orders],
  );

  return { preparing, onTheWay };
}
