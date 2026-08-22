import { useCallback, useState } from 'react';
import type { OrderStage } from '../../domain/order/order.entity';
import { ORDER_STAGES } from '../../domain/order/order.rules';

const STORAGE_KEY = 'meu-bolso:kds-collapsed-stages';

function readStored(): OrderStage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function useKdsCollapsedStages() {
  const [collapsed, setCollapsed] = useState<OrderStage[]>(readStored);

  const toggle = useCallback((stage: OrderStage) => {
    setCollapsed((current) => {
      const next = current.includes(stage)
        ? current.filter((item) => item !== stage)
        : [...current, stage];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        return next;
      }
      return next;
    });
  }, []);

  const isCollapsed = useCallback(
    (stage: OrderStage) => collapsed.includes(stage),
    [collapsed],
  );

  return { isCollapsed, toggle };
}
