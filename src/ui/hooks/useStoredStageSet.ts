import { useCallback, useState } from 'react';
import type { OrderStage } from '../../domain/order/order.entity';
import { ORDER_STAGES } from '../../domain/order/order.rules';

function readStored(key: string): OrderStage[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((stage): stage is OrderStage =>
      ORDER_STAGES.includes(stage as OrderStage),
    );
  } catch {
    return [];
  }
}

export function useStoredStageSet(key: string) {
  const [stages, setStages] = useState<OrderStage[]>(() => readStored(key));

  const toggle = useCallback(
    (stage: OrderStage) => {
      setStages((current) => {
        const next = current.includes(stage)
          ? current.filter((item) => item !== stage)
          : [...current, stage];
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          return next;
        }
        return next;
      });
    },
    [key],
  );

  const has = useCallback(
    (stage: OrderStage) => stages.includes(stage),
    [stages],
  );

  return { stages, has, toggle };
}
