import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { cn } from '../lib/cn';
import { useSession } from '../hooks/useSession';
import { useKdsOrders } from '../hooks/useKdsOrders';
import { useKdsCollapsedStages } from '../hooks/useKdsCollapsedStages';
import {
  ORDER_STAGES,
  STAGE_LABELS,
  nextStage,
  prevStage,
} from '../../domain/order/order.rules';

export function KdsPage() {
  const { activeSession } = useSession();
  const { byStage, moveStage } = useKdsOrders(activeSession?.uid);
  const { isCollapsed, toggle } = useKdsCollapsedStages();

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">KDS</h1>

      {!activeSession ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Abra o caixa para gerenciar pedidos.
        </div>
      ) : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          {ORDER_STAGES.map((stage) => {
            const list = byStage(stage);
            const collapsed = isCollapsed(stage);
            return (
              <div
                key={stage}
                className={cn(
                  'flex gap-2 rounded-xl border border-border bg-surface-inset p-2 transition-[flex]',
                  collapsed
                    ? 'flex-col lg:h-[60vh] lg:w-14 lg:shrink-0'
                    : 'flex-col lg:flex-1',
                )}
              >
                <button
                  type="button"
                  aria-expanded={!collapsed}
                  aria-label={`${collapsed ? 'Expandir' : 'Recolher'} etapa ${STAGE_LABELS[stage]}`}
                  className={cn(
                    'flex items-center rounded-md transition-colors hover:bg-surface-2',
                    collapsed
                      ? 'justify-between px-1 py-1 lg:h-full lg:flex-col lg:justify-start lg:gap-3 lg:px-0 lg:py-3'
                      : 'justify-between px-1 py-1',
                  )}
                  onClick={() => toggle(stage)}
                >
                  <span
                    className={cn(
                      'text-sm font-bold text-ink-secondary',
                      collapsed
                        ? 'lg:[writing-mode:vertical-rl] lg:rotate-180'
                        : '',
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      collapsed ? 'lg:flex-col-reverse' : '',
                    )}
                  >
                    <Badge tone="muted" size="xs">
                      {list.length}
                    </Badge>
                    <ChevronDown
                      size={16}
                      strokeWidth={2}
                      className={cn(
                        'text-ink-tertiary transition-transform',
                        collapsed ? '-rotate-90' : '',
                      )}
                    />
                  </span>
                </button>
                {!collapsed &&
                  list.map((order) => {
                    const previous = prevStage(order.stage);
                    const next = nextStage(order.stage);
                    return (
                      <div
                        key={order.id}
                        className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold tabular-nums text-ink-primary">
                            #{order.ticket}
                          </span>
                          <Money
                            value={order.total}
                            className="font-semibold"
                          />
                        </div>
                        {order.customerName && (
                          <span className="text-sm text-ink-secondary">
                            {order.customerName}
                          </span>
                        )}
                        <span className="text-sm text-ink-tertiary">
                          {order.items
                            .map((item) => `${item.qty}x ${item.name}`)
                            .join(', ')}
                        </span>
                        <div className="flex gap-2">
                          {previous && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveStage(order.uid, previous)}
                            >
                              <ChevronLeft size={14} /> Voltar
                            </Button>
                          )}
                          {next && (
                            <Button
                              size="sm"
                              onClick={() => moveStage(order.uid, next)}
                            >
                              Avançar <ChevronRight size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
