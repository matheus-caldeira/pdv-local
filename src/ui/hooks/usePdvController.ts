import { useCallback, useEffect, useMemo, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import {
  BusinessTypeNotSelectedError,
  UnknownBusinessTypeError,
} from '../../domain/errors';
import { calculateOrderTotal } from '../../domain/order/order.rules';
import { getBusinessType } from '../../domain/business-type/registry';
import type { OrderItem, OrderStatus } from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';
import type { Customer } from '../../domain/customer/customer.entity';
import { useToast } from '../molecules/toast-context';
import { useCustomerSearch } from './useCustomerSearch';
import { useTicketSuggestion } from './useTicketSuggestion';

export interface CartItem extends OrderItem {
  cartId: string;
}

export type PayOption = 'now' | 'tab' | 'delivery';

function genCartId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
}

function statusForOption(option: PayOption): OrderStatus {
  if (option === 'now') return 'paid';
  if (option === 'delivery') return 'pending';
  return 'open';
}

export function usePdvController(sessionUid: string) {
  const toast = useToast();
  const { suggestion, refresh: refreshTicket } = useTicketSuggestion();
  const customerSearch = useCustomerSearch();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [ticket, setTicket] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [businessTypeId, setBusinessTypeId] = useState('');

  useEffect(() => {
    setTicket(suggestion);
  }, [suggestion]);

  useEffect(() => {
    let cancelled = false;
    container.readConfig().then((result) => {
      if (cancelled) return;
      fold(
        result,
        () => undefined,
        (config) => setBusinessTypeId(config.businessTypeId),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordering = useMemo(
    () => getBusinessType(businessTypeId)?.rules.ordering ?? 'optional',
    [businessTypeId],
  );

  const total = useMemo(() => calculateOrderTotal(cart), [cart]);
  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const onCustomerNameChange = useCallback(
    (value: string) => {
      setCustomerName(value);
      setMatchedCustomer(null);
      void customerSearch.search(value);
    },
    [customerSearch],
  );

  const selectCustomer = useCallback(
    (customer: Customer) => {
      setMatchedCustomer(customer);
      setCustomerName(customer.name);
      setAddress(customer.addresses[0] || '');
      customerSearch.clear();
    },
    [customerSearch],
  );

  const addSimpleToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.productUid === product.uid && !item.customizations?.length,
      );
      if (existing) {
        return prev.map((item) =>
          item.cartId === existing.cartId
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          cartId: genCartId(),
          productUid: product.uid,
          name: product.name,
          salePrice: product.salePrice,
          costPrice: product.costPrice,
          qty: 1,
        },
      ];
    });
  }, []);

  const addCustomizedToCart = useCallback((item: OrderItem) => {
    setCart((prev) => [...prev, { ...item, cartId: genCartId() }]);
  }, []);

  const updateQty = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartId === cartId ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }, []);

  const removeCartItem = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const setObservation = useCallback((cartId: string, observation: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId
          ? { ...item, observation: observation.trim() || undefined }
          : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const resetForm = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setAddress('');
    setMatchedCustomer(null);
    customerSearch.clear();
    refreshTicket();
  }, [customerSearch, refreshTicket]);

  const finalizeSale = useCallback(
    async (option: PayOption, paymentMethod: string | null) => {
      const definition = getBusinessType(businessTypeId);
      if (!definition) {
        const error = businessTypeId
          ? new UnknownBusinessTypeError(businessTypeId)
          : new BusinessTypeNotSelectedError();
        toast(error.message, 'error');
        return false;
      }

      const edited = ticket.trim() !== suggestion;
      const orderTicket = edited ? ticket.trim() || '-' : undefined;
      const realAddress = address === '__new__' ? '' : address.trim();

      const items: OrderItem[] = cart.map((item) => ({
        productUid: item.productUid,
        name: item.name,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        qty: item.qty,
        observation: item.observation,
        customizations: item.customizations,
        customizationTotal: item.customizationTotal,
      }));

      const result = await container.registerOrder(businessTypeId, definition, {
        sessionUid,
        items,
        ticket: orderTicket,
        paymentMethod: option === 'tab' ? null : paymentMethod,
        status: statusForOption(option),
        customerName,
        customerPhone: matchedCustomer?.phone ?? '',
        customerAddress: realAddress,
      });

      return fold(
        result,
        (error) => {
          toast(
            error instanceof AppError
              ? error.message
              : 'Erro ao registrar venda.',
            'error',
          );
          return false;
        },
        () => {
          toast('Venda registrada!');
          resetForm();
          return true;
        },
      );
    },
    [
      address,
      businessTypeId,
      cart,
      customerName,
      matchedCustomer,
      resetForm,
      sessionUid,
      suggestion,
      ticket,
      toast,
    ],
  );

  return {
    cart,
    total,
    totalQty,
    ordering,
    customerName,
    setCustomerName,
    onCustomerNameChange,
    address,
    setAddress,
    ticket,
    setTicket,
    matchedCustomer,
    customerSuggestions: customerSearch.suggestions,
    selectCustomer,
    addSimpleToCart,
    addCustomizedToCart,
    updateQty,
    removeCartItem,
    setObservation,
    clearCart,
    finalizeSale,
  };
}
