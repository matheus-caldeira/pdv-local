import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order, OrderItem } from '../../domain/order/order.entity';
import { useToast } from '../molecules/toast-context';
import { useActiveBusinessType } from './useActiveBusinessType';

export function useTabs(sessionUid: string) {
  const toast = useToast();
  const { definition } = useActiveBusinessType();
  const [openTabs, setOpenTabs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await container.listOrders();
    fold(
      result,
      (error) => {
        toast(error.message, 'error');
        setLoading(false);
      },
      (orders) => {
        setOpenTabs(orders.filter((order) => order.status === 'open'));
        setLoading(false);
      },
    );
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openTab = useCallback(
    async (
      customerName: string,
      options: { customerUid?: string; ticket?: string } = {},
    ): Promise<Order | null> => {
      if (!definition) {
        toast('Tipo de negócio não definido.', 'error');
        return null;
      }
      const result = await container.openTab(definition, {
        sessionUid,
        customerName,
        customerUid: options.customerUid,
        ticket: options.ticket,
      });
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return null;
        },
        (order) => {
          void refresh();
          return order;
        },
      );
    },
    [definition, refresh, sessionUid, toast],
  );

  const addItems = useCallback(
    async (orderUid: string, items: OrderItem[]) => {
      const result = await container.addItemsToTab({ orderUid, items });
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          void refresh();
          return true;
        },
      );
    },
    [refresh, toast],
  );

  const updateItems = useCallback(
    async (orderUid: string, items: OrderItem[]) => {
      const result = await container.updateTabItems({ orderUid, items });
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          void refresh();
          return true;
        },
      );
    },
    [refresh, toast],
  );

  const closeTab = useCallback(
    async (orderUid: string) => {
      const result = await container.closeTab({ orderUid });
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          void refresh();
          return true;
        },
      );
    },
    [refresh, toast],
  );

  const reopenTab = useCallback(
    async (orderUid: string) => {
      const result = await container.reopenTab({ orderUid });
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          void refresh();
          return true;
        },
      );
    },
    [refresh, toast],
  );

  return {
    openTabs,
    loading,
    openTab,
    addItems,
    updateItems,
    closeTab,
    reopenTab,
    refresh,
  };
}
