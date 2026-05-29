import { useCallback, useEffect, useMemo, useState } from 'react';
import { fold } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import { calculateOrderTotal } from '../../domain/order/order.rules';
import type { OrderItem, OrderStatus } from '../../domain/order/order.entity';
import type { Product } from '../../domain/product/product.entity';
import type { Customer } from '../../domain/customer/customer.entity';
import { useToast } from '../molecules/toast-context';
import { useFinalizeOrder } from './useFinalizeOrder';
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

export function usePdvController(sessionId: number) {
  const toast = useToast();
  const finalizeOrder = useFinalizeOrder();
  const { suggestion, refresh: refreshTicket } = useTicketSuggestion();
  const customerSearch = useCustomerSearch();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ticket, setTicket] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    setTicket(suggestion);
  }, [suggestion]);

  const total = useMemo(() => calculateOrderTotal(cart), [cart]);
  const totalQty = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const onPhoneChange = useCallback(
    (value: string) => {
      setPhone(value);
      setMatchedCustomer(null);
      customerSearch.search(value);
    },
    [customerSearch],
  );

  const selectCustomer = useCallback(
    (customer: Customer) => {
      setMatchedCustomer(customer);
      setPhone(customer.phone);
      setCustomerName(customer.name === 'Consumidor' ? '' : customer.name);
      setAddress(customer.addresses[0] || '');
      customerSearch.clear();
    },
    [customerSearch],
  );

  const addSimpleToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && !item.customizations?.length,
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
          productId: product.id!,
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

  const resetForm = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setMatchedCustomer(null);
    customerSearch.clear();
    refreshTicket();
  }, [customerSearch, refreshTicket]);

  const finalizeSale = useCallback(
    async (option: PayOption, paymentMethod: string | null) => {
      const edited = ticket.trim() !== suggestion;
      const orderTicket = edited ? ticket.trim() || '-' : null;
      const realAddress = address === '__new__' ? '' : address.trim();

      const items: OrderItem[] = cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        salePrice: item.salePrice,
        costPrice: item.costPrice,
        qty: item.qty,
        observation: item.observation,
        customizations: item.customizations,
        customizationTotal: item.customizationTotal,
      }));

      const result = await finalizeOrder({
        sessionId,
        items,
        paymentMethod: option === 'tab' ? null : paymentMethod,
        status: statusForOption(option),
        customerName,
        customerPhone: phone,
        customerAddress: realAddress,
        ticket: orderTicket,
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
      cart,
      customerName,
      finalizeOrder,
      phone,
      resetForm,
      sessionId,
      suggestion,
      ticket,
      toast,
    ],
  );

  return {
    cart,
    total,
    totalQty,
    customerName,
    setCustomerName,
    phone,
    onPhoneChange,
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
    finalizeSale,
  };
}
