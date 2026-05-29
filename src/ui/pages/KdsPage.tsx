import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { useSession } from '../hooks/useSession';
import { useKdsOrders } from '../hooks/useKdsOrders';
import {
  ORDER_STAGES,
  STAGE_LABELS,
  nextStage,
  prevStage,
} from '../../domain/order/order.rules';

export function KdsPage() {
  const { activeSession } = useSession();
  const { byStage, moveStage } = useKdsOrders(activeSession?.id);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight">KDS</h1>

      {!activeSession ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Abra o caixa para gerenciar pedidos.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER_STAGES.map((stage) => {
            const list = byStage(stage);
            return (
              <div
                key={stage}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-inset p-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-ink-secondary">
                    {STAGE_LABELS[stage]}
                  </span>
                  <Badge tone="muted" size="xs">
                    {list.length}
                  </Badge>
                </div>
                {list.map((order) => {
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
                        <Money value={order.total} className="font-semibold" />
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
                            onClick={() => moveStage(order.id!, previous)}
                          >
                            <ChevronLeft size={14} /> Voltar
                          </Button>
                        )}
                        {next && (
                          <Button
                            size="sm"
                            onClick={() => moveStage(order.id!, next)}
                          >
                            Avancar <ChevronRight size={14} />
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
