import { useCallback, useEffect, useRef, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Order, OrderStatus } from '../../domain/order/order.entity';
import { useToast } from '../molecules/toast-context';

export const ORDERS_PAGE_SIZE = 30;
export const DEFAULT_ORDER_STATUSES: OrderStatus[] = ['open', 'pending'];

const SEARCH_DEBOUNCE_MS = 300;

export function useOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statuses, setStatuses] = useState<OrderStatus[]>(
    DEFAULT_ORDER_STATUSES,
  );
  const [term, setTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusControlEnabled, setStatusControlEnabled] = useState(false);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedTerm(term),
      term ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [term]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const result = await container.listOrderPage({
        statuses,
        term: debouncedTerm,
        offset,
        limit: ORDERS_PAGE_SIZE,
      });
      fold(
        result,
        (error) => {
          toast(error.message, 'error');
          if (offset === 0) {
            setOrders([]);
            setTotal(0);
            setHasMore(false);
          }
        },
        (page) => {
          setOrders((current) =>
            offset === 0 ? page.orders : [...current, ...page.orders],
          );
          setTotal(page.total);
          setHasMore(page.hasMore);
          offsetRef.current = offset + page.orders.length;
        },
      );
    },
    [statuses, debouncedTerm, toast],
  );

  useEffect(() => {
    offsetRef.current = 0;
    void fetchPage(0);
  }, [fetchPage]);

  useEffect(() => {
    async function loadConfig() {
      const result = await container.readConfig();
      fold(
        result,
        (error) => toast(error.message, 'error'),
        (config) => setStatusControlEnabled(config.statusControlEnabled),
      );
    }
    loadConfig();
  }, [toast]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    void fetchPage(offsetRef.current).finally(() => {
      loadingRef.current = false;
      setLoading(false);
    });
  }, [hasMore, fetchPage]);

  const reload = useCallback(() => {
    offsetRef.current = 0;
    return fetchPage(0);
  }, [fetchPage]);

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
          reload();
          return true;
        },
      );
    },
    [toast, reload],
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
          reload();
          return true;
        },
      );
    },
    [toast, reload],
  );

  return {
    orders,
    statuses,
    setStatuses,
    term,
    setTerm,
    total,
    hasMore,
    loading,
    loadMore,
    reload,
    statusControlEnabled,
    markPaid,
    cancel,
  };
}
