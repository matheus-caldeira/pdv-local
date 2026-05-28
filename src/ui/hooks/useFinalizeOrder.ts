import { useCallback } from 'react';
import { container } from '../../app/container';
import type { FinalizeOrderInput } from '../../application/order/finalize-order.usecase';

export function useFinalizeOrder() {
  return useCallback(
    (input: FinalizeOrderInput) => container.finalizeOrder(input),
    [],
  );
}
