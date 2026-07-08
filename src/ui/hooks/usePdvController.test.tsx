import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { usePdvController } from './usePdvController';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { EmptyCartError } from '../../domain/errors';
import type { Product } from '../../domain/product/product.entity';
import type { FinalizeOrderInput } from '../../application/order/finalize-order.usecase';

const finalizeOrder = vi.fn();
const peekTicketSuggestion = vi.fn();
const searchCustomersByPhone = vi.fn();
const readConfig = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    finalizeOrder: (input: FinalizeOrderInput) => finalizeOrder(input),
    peekTicketSuggestion: () => peekTicketSuggestion(),
    searchCustomersByPhone: (value: string) => searchCustomersByPhone(value),
    readConfig: () => readConfig(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function product(partial: Partial<Product> & { id: number }): Product {
  return {
    uid: `product-${partial.id}`,
    name: 'X',
    category: 'c',
    costPrice: 5,
    salePrice: 10,
    stock: 3,
    active: true,
    customizationGroupIds: [],
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

async function setup() {
  peekTicketSuggestion.mockResolvedValue(right('0001'));
  const view = renderHook(() => usePdvController('session-7'), { wrapper });
  await waitFor(() => expect(view.result.current.ticket).toBe('0001'));
  return view;
}

describe('usePdvController', () => {
  beforeEach(() => {
    finalizeOrder.mockReset();
    peekTicketSuggestion.mockReset();
    searchCustomersByPhone.mockReset();
    readConfig.mockReset();
    peekTicketSuggestion.mockResolvedValue(right('0001'));
    searchCustomersByPhone.mockResolvedValue(right([]));
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'tab',
        name: '',
        document: '',
        phone: '',
        address: '',
        ticketCounter: 0,
        ticketLimit: 0,
        ticketAutoReset: false,
        statusControlEnabled: false,
        extra: {},
      }),
    );
  });
  afterEach(cleanup);

  it('adds simple products and stacks repeats, then updates and removes', async () => {
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 2, salePrice: 5 })));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    expect(result.current.cart).toHaveLength(2);
    const burger = result.current.cart.find(
      (item) => item.productUid === 'product-1',
    )!;
    expect(burger.qty).toBe(2);
    expect(result.current.total).toBe(25);
    expect(result.current.totalQty).toBe(3);

    act(() => result.current.updateQty(burger.cartId, 1));
    expect(
      result.current.cart.find((item) => item.productUid === 'product-1')!.qty,
    ).toBe(3);
    act(() => result.current.updateQty(burger.cartId, -3));
    expect(result.current.cart).toHaveLength(1);

    const remaining = result.current.cart[0].cartId;
    act(() => result.current.removeCartItem(remaining));
    expect(result.current.cart).toHaveLength(0);
  });

  it('adds a customized item and sets its observation', async () => {
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() =>
      result.current.addCustomizedToCart({
        productUid: 'product-9',
        name: 'Combo',
        salePrice: 30,
        costPrice: 10,
        qty: 1,
        customizationTotal: 5,
      }),
    );
    const cartId = result.current.cart[1].cartId;
    act(() => result.current.setObservation(cartId, '  caprichado  '));
    expect(result.current.cart[1].observation).toBe('caprichado');
    act(() => result.current.setObservation(cartId, '   '));
    expect(result.current.cart[1].observation).toBeUndefined();
  });

  it('searches and selects a customer, mapping Consumidor to empty name', async () => {
    searchCustomersByPhone.mockResolvedValue(
      right([
        {
          id: 1,
          uid: 'customer-1',
          name: 'Consumidor',
          phone: '99887766',
          addresses: [],
          extra: {},
          createdAt: 0,
          updatedAt: 0,
        },
      ]),
    );
    const { result } = await setup();
    await act(async () => result.current.onPhoneChange('9988'));
    await waitFor(() =>
      expect(result.current.customerSuggestions).toHaveLength(1),
    );
    act(() =>
      result.current.selectCustomer(result.current.customerSuggestions[0]),
    );
    expect(result.current.customerName).toBe('');
    expect(result.current.phone).toBe('99887766');
    expect(result.current.matchedCustomer).not.toBeNull();
    expect(result.current.customerSuggestions).toHaveLength(0);
  });

  it('selects a named customer with an address', async () => {
    const { result } = await setup();
    act(() =>
      result.current.selectCustomer({
        id: 2,
        uid: 'customer-2',
        name: 'Maria',
        phone: '11112222',
        addresses: ['Rua X'],
        extra: {},
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(result.current.customerName).toBe('Maria');
    expect(result.current.address).toBe('Rua X');
  });

  it('defaults phone to an empty string when the customer has none', async () => {
    const { result } = await setup();
    act(() =>
      result.current.selectCustomer({
        id: 3,
        uid: 'customer-3',
        name: 'Sem Telefone',
        addresses: [],
        extra: {},
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(result.current.phone).toBe('');
  });

  it('falls back to empty businessTypeId when reading the config fails', async () => {
    readConfig.mockResolvedValueOnce(left(new EmptyCartError()));
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(result.current.ordering).toBe('optional');
  });

  it('ignores the config read when unmounted before it resolves', async () => {
    let resolveConfig: (value: Awaited<ReturnType<typeof readConfig>>) => void;
    readConfig.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveConfig = resolve;
      }),
    );
    const { unmount } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    unmount();
    resolveConfig!(
      right({
        businessTypeId: 'tab',
        name: '',
        document: '',
        phone: '',
        address: '',
        ticketCounter: 0,
        ticketLimit: 0,
        ticketAutoReset: false,
        statusControlEnabled: false,
        extra: {},
      }),
    );
    await Promise.resolve();
  });

  it('finalizes a paid sale claiming the suggested ticket and resets', async () => {
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    peekTicketSuggestion
      .mockResolvedValueOnce(right('0001'))
      .mockResolvedValueOnce(right('0002'));
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ticket).toBe('0001'));

    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setCustomerName('Joao'));

    let ok = false;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(true);
    expect(finalizeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionUid: 'session-7',
        businessTypeId: 'tab',
        status: 'paid',
        paymentMethod: 'pix',
        ticket: null,
        customerName: 'Joao',
        items: [expect.objectContaining({ productUid: 'product-1', qty: 1 })],
      }),
    );
    await waitFor(() => expect(result.current.cart).toHaveLength(0));
    expect(result.current.customerName).toBe('');
  });

  it('uses an edited ticket and falls back to a dash when blank', async () => {
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setTicket('   '));
    await act(async () => {
      await result.current.finalizeSale('tab', null);
    });
    expect(finalizeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket: '-',
        paymentMethod: null,
        status: 'open',
      }),
    );
  });

  it('uses a typed ticket and maps delivery to pending and trims address', async () => {
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setTicket('MESA-5'));
    act(() => result.current.setAddress('__new__'));
    await act(async () => {
      await result.current.finalizeSale('delivery', 'dinheiro');
    });
    expect(finalizeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket: 'MESA-5',
        status: 'pending',
        paymentMethod: 'dinheiro',
        customerAddress: '',
      }),
    );
  });

  it('passes a normal address through trimmed', async () => {
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setAddress('  Rua das Flores  '));
    await act(async () => {
      await result.current.finalizeSale('now', 'pix');
    });
    expect(finalizeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerAddress: 'Rua das Flores' }),
    );
  });

  it('shows the AppError message on a Left and keeps the cart', async () => {
    finalizeOrder.mockResolvedValue(left(new EmptyCartError()));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    let ok = true;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(false);
    expect(result.current.cart).toHaveLength(1);
  });

  it('shows a generic message when the Left is not an AppError', async () => {
    finalizeOrder.mockResolvedValue(left({ message: 'boom' }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    let ok = true;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(false);
  });
});
