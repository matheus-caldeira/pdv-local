import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTabs } from './useTabs';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { getBusinessType } from '../../domain/business-type/registry';
import { TabNotOpenError } from '../../domain/errors';
import type { Order } from '../../domain/order/order.entity';

const resolveActiveType = vi.fn();
const listOrders = vi.fn();
const openTab = vi.fn();
const addItemsToTab = vi.fn();
const updateTabItems = vi.fn();
const closeTab = vi.fn();
const reopenTab = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    resolveActiveType: () => resolveActiveType(),
    listOrders: () => listOrders(),
    openTab: (definition: unknown, input: unknown) =>
      openTab(definition, input),
    addItemsToTab: (input: unknown) => addItemsToTab(input),
    updateTabItems: (input: unknown) => updateTabItems(input),
    closeTab: (input: unknown) => closeTab(input),
    reopenTab: (input: unknown) => reopenTab(input),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const order = (over: Partial<Order> = {}): Order => ({
  uid: 'order-1',
  businessTypeId: 'scout',
  sessionUid: 'session-1',
  items: [],
  total: 0,
  paymentMethod: null,
  customerName: 'Maju',
  customerPhone: '',
  ticket: '001',
  stage: 'aceito',
  status: 'open',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('useTabs', () => {
  beforeEach(() => {
    resolveActiveType.mockReset();
    listOrders.mockReset();
    openTab.mockReset();
    addItemsToTab.mockReset();
    updateTabItems.mockReset();
    closeTab.mockReset();
    reopenTab.mockReset();
    resolveActiveType.mockResolvedValue(right(getBusinessType('scout')));
    listOrders.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('lista apenas as comandas abertas', async () => {
    listOrders.mockResolvedValue(
      right([
        order({ uid: 'a', status: 'open' }),
        order({ uid: 'b', status: 'paid' }),
        order({ uid: 'c', status: 'pending' }),
      ]),
    );

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });

    await waitFor(() => expect(result.current.openTabs).toHaveLength(1));
    expect(result.current.openTabs[0].uid).toBe('a');
  });

  it('toasta e não lista quando a busca falha', async () => {
    listOrders.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.openTabs).toEqual([]);
  });

  it('abre comanda e devolve a comanda criada no sucesso', async () => {
    openTab.mockResolvedValue(right(order({ uid: 'nova' })));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let opened: Order | null | undefined;
    await act(async () => {
      opened = await result.current.openTab('Maju (Lobinha)');
    });

    expect(opened?.uid).toBe('nova');
    expect(openTab).toHaveBeenCalledWith(
      getBusinessType('scout'),
      expect.objectContaining({
        sessionUid: 'session-1',
        customerName: 'Maju (Lobinha)',
      }),
    );
  });

  it('vincula o cliente informado à comanda', async () => {
    openTab.mockResolvedValue(right(order({ uid: 'nova' })));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.openTab('Maju', { customerUid: 'customer-7' });
    });

    expect(openTab).toHaveBeenCalledWith(
      getBusinessType('scout'),
      expect.objectContaining({ customerUid: 'customer-7' }),
    );
  });

  it('toasta e devolve null ao abrir sem tipo de negócio definido', async () => {
    resolveActiveType.mockResolvedValue(new Promise(() => {}));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });

    let opened: Order | null | undefined;
    await act(async () => {
      opened = await result.current.openTab('Maju');
    });

    expect(opened).toBeNull();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('devolve null quando abrir comanda falha', async () => {
    openTab.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let opened: Order | null | undefined;
    await act(async () => {
      opened = await result.current.openTab('Maju');
    });

    expect(opened).toBeNull();
  });

  it('lança itens na comanda e devolve true no sucesso', async () => {
    addItemsToTab.mockResolvedValue(right(order()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addItems('order-1', [
        {
          name: 'Refrigerante',
          salePrice: 5,
          costPrice: 2,
          qty: 1,
        },
      ]);
    });

    expect(ok).toBe(true);
    expect(addItemsToTab).toHaveBeenCalledWith(
      expect.objectContaining({ orderUid: 'order-1' }),
    );
  });

  it('devolve false quando lançar itens falha', async () => {
    addItemsToTab.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addItems('order-1', []);
    });

    expect(ok).toBe(false);
  });

  it('atualiza os itens da comanda e devolve true no sucesso', async () => {
    updateTabItems.mockResolvedValue(right(order()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateItems('order-1', [
        {
          name: 'Refrigerante',
          salePrice: 5,
          costPrice: 2,
          qty: 1,
        },
      ]);
    });

    expect(ok).toBe(true);
    expect(updateTabItems).toHaveBeenCalledWith(
      expect.objectContaining({ orderUid: 'order-1' }),
    );
  });

  it('devolve false quando atualizar os itens falha', async () => {
    updateTabItems.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.updateItems('order-1', []);
    });

    expect(ok).toBe(false);
  });

  it('fecha comanda e devolve true no sucesso', async () => {
    closeTab.mockResolvedValue(right(order({ status: 'pending' })));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.closeTab('order-1');
    });

    expect(ok).toBe(true);
    expect(closeTab).toHaveBeenCalledWith({ orderUid: 'order-1' });
  });

  it('devolve false quando o use case de fechar falha', async () => {
    closeTab.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.closeTab('order-1');
    });

    expect(ok).toBe(false);
  });

  it('reabre comanda e devolve true no sucesso', async () => {
    reopenTab.mockResolvedValue(right(order({ status: 'open' })));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.reopenTab('order-1');
    });

    expect(ok).toBe(true);
    expect(reopenTab).toHaveBeenCalledWith({ orderUid: 'order-1' });
  });

  it('devolve false quando o use case de reabrir falha', async () => {
    reopenTab.mockResolvedValue(left(new TabNotOpenError()));

    const { result } = renderHook(() => useTabs('session-1'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.reopenTab('order-1');
    });

    expect(ok).toBe(false);
  });
});
