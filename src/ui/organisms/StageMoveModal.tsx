import { Zap } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { cn } from '../lib/cn';
import type { OrderStage } from '../../domain/order/order.entity';
import { ORDER_STAGES, STAGE_LABELS } from '../../domain/order/order.rules';

interface StageMoveModalProps {
  open: boolean;
  ticket: string;
  currentStage: OrderStage;
  autoStages: OrderStage[];
  blockedStage: OrderStage | null;
  onClose: () => void;
  onSelect: (stage: OrderStage) => void;
}

export function StageMoveModal({
  open,
  ticket,
  currentStage,
  autoStages,
  blockedStage,
  onClose,
  onSelect,
}: StageMoveModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Mover pedido #${ticket}`}>
      {blockedStage && (
        <p className="mb-4 rounded-md bg-warning-subtle px-3 py-2 text-sm text-ink-secondary">
          {STAGE_LABELS[blockedStage]} avança automaticamente, então o pedido
          não fica parado nessa etapa. Escolha para onde ele deve ir.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {ORDER_STAGES.map((stage) => {
          const isCurrent = stage === currentStage;
          const isAuto = autoStages.includes(stage);
          return (
            <button
              key={stage}
              type="button"
              disabled={isCurrent}
              aria-label={
                isAuto
                  ? `${STAGE_LABELS[stage]} — avança automaticamente`
                  : STAGE_LABELS[stage]
              }
              className={cn(
                'flex items-center justify-between rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors',
                isCurrent
                  ? 'border-border bg-surface-inset text-ink-tertiary'
                  : 'border-border-emphasis text-ink-primary hover:bg-surface-inset',
              )}
              onClick={() => onSelect(stage)}
            >
              <span>{STAGE_LABELS[stage]}</span>
              {isCurrent ? (
                <span className="text-xs text-ink-tertiary">etapa atual</span>
              ) : (
                isAuto && (
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <Zap size={12} strokeWidth={2} />
                    avança sozinho
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
      <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
        Cancelar
      </Button>
    </Modal>
  );
}
