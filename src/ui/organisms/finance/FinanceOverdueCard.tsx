import { Money } from '../../atoms/Money';
import { Button } from '../../atoms/Button';
import { formatDate } from '../../../domain/shared/format';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

interface FinanceOverdueCardProps {
  entries: FinanceEntry[];
  total: number;
  onMarkPaid(uid: string): void;
}

export function FinanceOverdueCard({
  entries,
  total,
  onMarkPaid,
}: FinanceOverdueCardProps) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Contas atrasadas"
      className="flex flex-col gap-2 rounded-md border border-danger bg-danger-subtle px-4 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-danger">
          Atrasadas
        </h3>
        <Money value={total} className="font-bold text-danger" />
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li
            key={entry.uid}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-ink-primary">
                {entry.description}
              </span>
              <span className="text-xs text-ink-tertiary">
                {formatDate(entry.date)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <Money value={entry.amount} className="font-bold text-danger" />
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Marcar ${entry.description} como pago`}
                onClick={() => onMarkPaid(entry.uid)}
              >
                Marcar pago
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
