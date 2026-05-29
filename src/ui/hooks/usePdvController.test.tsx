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
const configGet = vi.fn();
const customersToArray = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    finalizeOrder: (input: FinalizeOrderInput) => finalizeOrder(input),
  },
}));

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({
    config: { get: configGet },
    customers: { toArray: customersToArray },
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function product(partial: Partial<Product> & { id: number }): Product {
  return {
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
  configGet.mockResolvedValue({ ticketCounter: 1, ticketLimit: 9999 });
  const view = renderHook(() => usePdvController(7), { wrapper });
  await waitFor(() => expect(view.result.current.ticket).toBe('0001'));
  return view;
}

describe('usePdvController', () => {
  beforeEach(() => {
    finalizeOrder.mockReset();
    configGet.mockReset();
    customersToArray.mockReset();
  });
  afterEach(cleanup);

  it('adds simple products and stacks repeats, then updates and removes', async () => {
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 2, salePrice: 5 })));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    expect(result.current.cart).toHaveLength(2);
    const burger = result.current.cart.find((item) => item.productId === 1)!;
    expect(burger.qty).toBe(2);
    expect(result.current.total).toBe(25);
    expect(result.current.totalQty).toBe(3);

    act(() => result.current.updateQty(burger.cartId, 1));
    expect(result.current.cart.find((item) => item.productId === 1)!.qty).toBe(
      3,
    );
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
        productId: 9,
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
    customersToArray.mockResolvedValue([
      { id: 1, name: 'Consumidor', phone: '99887766', addresses: [] },
    ]);
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
        name: 'Maria',
        phone: '11112222',
        addresses: ['Rua X'],
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(result.current.customerName).toBe('Maria');
    expect(result.current.address).toBe('Rua X');
  });

  it('finalizes a paid sale claiming the suggested ticket and resets', async () => {
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    configGet
      .mockResolvedValueOnce({ ticketCounter: 1, ticketLimit: 9999 })
      .mockResolvedValueOnce({ ticketCounter: 2, ticketLimit: 9999 });
    const { result } = renderHook(() => usePdvController(7), { wrapper });
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
        sessionId: 7,
        status: 'paid',
        paymentMethod: 'pix',
        ticket: null,
        customerName: 'Joao',
        items: [expect.objectContaining({ productId: 1, qty: 1 })],
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
