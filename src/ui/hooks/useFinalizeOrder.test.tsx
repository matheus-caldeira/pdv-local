import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFinalizeOrder } from './useFinalizeOrder';
import { right } from '../../domain/shared/either';
import type { FinalizeOrderInput } from '../../application/order/finalize-order.usecase';

const finalizeOrder = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    finalizeOrder: (input: FinalizeOrderInput) => finalizeOrder(input),
  },
}));

describe('useFinalizeOrder', () => {
  afterEach(() => vi.clearAllMocks());

  it('forwards the input to the container use case', async () => {
    const order = { id: 1 };
    finalizeOrder.mockResolvedValue(right(order));
    const { result } = renderHook(() => useFinalizeOrder());
    const input: FinalizeOrderInput = {
      sessionId: 1,
      items: [],
      paymentMethod: null,
      status: 'open',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      ticket: null,
    };
    const output = await result.current(input);
    expect(finalizeOrder).toHaveBeenCalledWith(input);
    expect(output).toEqual(right(order));
  });
});
