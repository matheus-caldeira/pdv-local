import { Minus, Plus } from 'lucide-react';
import { cn } from '../lib/cn';

interface QtyStepperProps {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
  incrementDisabled?: boolean;
  hideZero?: boolean;
  size?: 'sm' | 'md';
}

const dims = {
  sm: { btn: 'h-7 w-7', icon: 12, label: 'min-w-4 text-sm' },
  md: { btn: 'h-8 w-8', icon: 14, label: 'min-w-6 text-base' },
};

export function QtyStepper({
  qty,
  onDecrement,
  onIncrement,
  incrementDisabled = false,
  hideZero = false,
  size = 'md',
}: QtyStepperProps) {
  const d = dims[size];
  const circle =
    'flex items-center justify-center rounded-full border border-border-emphasis bg-surface-2 text-ink-secondary hover:bg-surface-inset disabled:opacity-30 disabled:pointer-events-none cursor-pointer';
  const showQty = !hideZero || qty > 0;
  return (
    <div className="flex items-center gap-2">
      {showQty && (
        <>
          <button
            type="button"
            aria-label="Diminuir"
            className={cn(circle, d.btn)}
            onClick={onDecrement}
          >
            <Minus size={d.icon} />
          </button>
          <span
            className={cn(
              'text-center font-mono tabular-nums font-bold',
              d.label,
            )}
          >
            {qty}
          </span>
        </>
      )}
      <button
        type="button"
        aria-label="Aumentar"
        className={cn(circle, d.btn, 'border-accent text-accent')}
        onClick={onIncrement}
        disabled={incrementDisabled}
      >
        <Plus size={d.icon} />
      </button>
    </div>
  );
}
