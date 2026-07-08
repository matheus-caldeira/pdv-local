import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useRegisterOrder } from './useRegisterOrder';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { getBusinessType } from '../../domain/business-type/registry';
import { AppError } from '../../domain/shared/errors';
import type { RegisterOrderInput } from '../../application/order/register-order.usecase';

const resolveActiveType = vi.fn();
const registerOrder = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    resolveActiveType: () => resolveActiveType(),
    registerOrder: (
      businessTypeId: string,
      definition: unknown,
      input: RegisterOrderInput,
    ) => registerOrder(businessTypeId, definition, input),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

const input: RegisterOrderInput = {
  sessionUid: 'session-1',
  items: [
    {
      productUid: 'product-1',
      name: 'X',
      salePrice: 10,
      costPrice: 5,
      qty: 1,
    },
  ],
};

describe('useRegisterOrder', () => {
  beforeEach(() => {
    resolveActiveType.mockReset();
    registerOrder.mockReset();
  });
  afterEach(cleanup);

  it('delegates to container.registerOrder using the active definition', async () => {
    const scout = getBusinessType('scout')!;
    resolveActiveType.mockResolvedValue(right(scout));
    registerOrder.mockResolvedValue(right({ uid: 'order-1' }));

    const { result } = renderHook(() => useRegisterOrder(), { wrapper });
    await waitFor(() => expect(result.current.ordering).toBe('required'));

    let ok = false;
    await act(async () => {
      ok = await result.current.register(input);
    });

    expect(ok).toBe(true);
    expect(registerOrder).toHaveBeenCalledWith('scout', scout, input);
  });

  it('exposes optional ordering by default while loading', () => {
    resolveActiveType.mockResolvedValue(new Promise(() => {}));
    const { result } = renderHook(() => useRegisterOrder(), { wrapper });
    expect(result.current.ordering).toBe('optional');
  });

  it('exposes none ordering for a definition without ordering requirement', async () => {
    const quickSale = getBusinessType('quick_sale')!;
    resolveActiveType.mockResolvedValue(right(quickSale));

    const { result } = renderHook(() => useRegisterOrder(), { wrapper });
    await waitFor(() => expect(result.current.ordering).toBe('none'));
  });

  it('toasts and returns false when there is no active definition yet', async () => {
    resolveActiveType.mockResolvedValue(new Promise(() => {}));
    const { result } = renderHook(() => useRegisterOrder(), { wrapper });

    let ok = true;
    await act(async () => {
      ok = await result.current.register(input);
    });

    expect(ok).toBe(false);
    expect(registerOrder).not.toHaveBeenCalled();
  });

  it('toasts the error message and returns false on a Left', async () => {
    const scout = getBusinessType('scout')!;
    resolveActiveType.mockResolvedValue(right(scout));
    registerOrder.mockResolvedValue(
      left(new FakeError('Falha ao registrar pedido.')),
    );

    const { result } = renderHook(() => useRegisterOrder(), { wrapper });
    await waitFor(() => expect(result.current.ordering).toBe('required'));

    let ok = true;
    await act(async () => {
      ok = await result.current.register(input);
    });

    expect(ok).toBe(false);
  });
});
