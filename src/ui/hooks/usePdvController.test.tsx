import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { usePdvController } from './usePdvController';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { EmptyCartError } from '../../domain/errors';
import { getBusinessType } from '../../domain/business-type/registry';
import type { Product } from '../../domain/product/product.entity';
import type { BusinessTypeDefinition } from '../../domain/business-type/registry';
import type { RegisterOrderInput } from '../../application/order/register-order.usecase';

const registerOrder = vi.fn();
const peekTicketSuggestion = vi.fn();
const searchCustomers = vi.fn();
const readConfig = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    registerOrder: (
      businessTypeId: string,
      definition: BusinessTypeDefinition,
      input: RegisterOrderInput,
    ) => registerOrder(businessTypeId, definition, input),
    peekTicketSuggestion: () => peekTicketSuggestion(),
    searchCustomers: (value: string) => searchCustomers(value),
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
    registerOrder.mockReset();
    peekTicketSuggestion.mockReset();
    searchCustomers.mockReset();
    readConfig.mockReset();
    peekTicketSuggestion.mockResolvedValue(right('0001'));
    searchCustomers.mockResolvedValue(right([]));
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

  it('searches and selects a customer, keeping its name', async () => {
    searchCustomers.mockResolvedValue(
      right([
        {
          id: 1,
          uid: 'customer-1',
          name: 'Maju',
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
    expect(result.current.customerName).toBe('Maju');
    expect(result.current.phone).toBe('99887766');
    expect(result.current.matchedCustomer).not.toBeNull();
    expect(result.current.customerSuggestions).toHaveLength(0);
  });

  it('busca clientes pelo nome digitado e limpa o vínculo anterior', async () => {
    searchCustomers.mockResolvedValue(
      right([
        {
          id: 1,
          uid: 'customer-1',
          name: 'Maju',
          phone: '99887766',
          addresses: [],
          extra: {},
          createdAt: 0,
          updatedAt: 0,
        },
      ]),
    );
    const { result } = await setup();
    act(() =>
      result.current.selectCustomer({
        id: 9,
        uid: 'customer-9',
        name: 'Antigo',
        addresses: [],
        extra: {},
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(result.current.matchedCustomer).not.toBeNull();

    await act(async () => result.current.onCustomerNameChange('Maj'));

    expect(result.current.customerName).toBe('Maj');
    expect(result.current.matchedCustomer).toBeNull();
    expect(searchCustomers).toHaveBeenCalledWith('Maj');
    await waitFor(() =>
      expect(result.current.customerSuggestions).toHaveLength(1),
    );
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
    registerOrder.mockResolvedValue(right({ id: 1 }));
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
    expect(registerOrder).toHaveBeenCalledWith(
      'tab',
      getBusinessType('tab'),
      expect.objectContaining({
        sessionUid: 'session-7',
        status: 'paid',
        paymentMethod: 'pix',
        ticket: undefined,
        customerName: 'Joao',
        items: [expect.objectContaining({ productUid: 'product-1', qty: 1 })],
      }),
    );
    await waitFor(() => expect(result.current.cart).toHaveLength(0));
    expect(result.current.customerName).toBe('');
  });

  it('uses an edited ticket and falls back to a dash when blank', async () => {
    registerOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setTicket('   '));
    await act(async () => {
      await result.current.finalizeSale('tab', null);
    });
    expect(registerOrder).toHaveBeenCalledWith(
      'tab',
      getBusinessType('tab'),
      expect.objectContaining({
        ticket: '-',
        paymentMethod: null,
        status: 'open',
      }),
    );
  });

  it('uses a typed ticket and maps delivery to pending and trims address', async () => {
    registerOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setTicket('MESA-5'));
    act(() => result.current.setAddress('__new__'));
    await act(async () => {
      await result.current.finalizeSale('delivery', 'dinheiro');
    });
    expect(registerOrder).toHaveBeenCalledWith(
      'tab',
      getBusinessType('tab'),
      expect.objectContaining({
        ticket: 'MESA-5',
        status: 'pending',
        paymentMethod: 'dinheiro',
        customerAddress: '',
      }),
    );
  });

  it('passes a normal address through trimmed', async () => {
    registerOrder.mockResolvedValue(right({ id: 1 }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    act(() => result.current.setAddress('  Rua das Flores  '));
    await act(async () => {
      await result.current.finalizeSale('now', 'pix');
    });
    expect(registerOrder).toHaveBeenCalledWith(
      'tab',
      getBusinessType('tab'),
      expect.objectContaining({ customerAddress: 'Rua das Flores' }),
    );
  });

  it('shows the AppError message on a Left and keeps the cart', async () => {
    registerOrder.mockResolvedValue(left(new EmptyCartError()));
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
    registerOrder.mockResolvedValue(left({ message: 'boom' }));
    const { result } = await setup();
    act(() => result.current.addSimpleToCart(product({ id: 1 })));
    let ok = true;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(false);
  });

  it('toasts and does not call registerOrder when no business type is selected', async () => {
    readConfig.mockResolvedValue(
      right({
        businessTypeId: '',
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
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ordering).toBe('optional'));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));

    let ok = true;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(false);
    expect(registerOrder).not.toHaveBeenCalled();
  });

  it('toasts and does not call registerOrder when the business type is unknown', async () => {
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'ghost',
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
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ticket).toBe('0001'));
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    act(() => result.current.addSimpleToCart(product({ id: 1 })));

    let ok = true;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(false);
    expect(registerOrder).not.toHaveBeenCalled();
  });

  it('does not claim a ticket for a quick-sale business type with no ordering', async () => {
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'quick_sale',
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
    registerOrder.mockResolvedValue(right({ id: 1, ticket: '' }));
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ordering).toBe('none'));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));

    let ok = false;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(true);
    expect(registerOrder).toHaveBeenCalledWith(
      'quick_sale',
      getBusinessType('quick_sale'),
      expect.objectContaining({ ticket: undefined }),
    );
  });

  it('requires a ticket for a required-ordering business type and lets the use case claim it', async () => {
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'scout',
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
    registerOrder.mockResolvedValue(right({ id: 1, ticket: '0001' }));
    const { result } = renderHook(() => usePdvController('session-7'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.ordering).toBe('required'));
    act(() => result.current.addSimpleToCart(product({ id: 1 })));

    let ok = false;
    await act(async () => {
      ok = await result.current.finalizeSale('now', 'pix');
    });
    expect(ok).toBe(true);
    expect(registerOrder).toHaveBeenCalledWith(
      'scout',
      getBusinessType('scout'),
      expect.objectContaining({ ticket: undefined }),
    );
  });
});
