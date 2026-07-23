import { Money } from '../../atoms/Money';
import type { InvoiceHistoryPoint } from '../../../application/finance/invoices.usecases';
import type { MonthKey } from '../../../domain/finance/finance.entity';

interface FinanceInvoiceHistoryProps {
  points: InvoiceHistoryPoint[];
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

function variationTone(delta: number): string {
  if (delta > 0) return 'text-danger';
  if (delta < 0) return 'text-success';
  return 'text-ink-tertiary';
}

function variationPrefix(delta: number): string {
  if (delta > 0) return '+ ';
  if (delta < 0) return '- ';
  return '';
}

export function FinanceInvoiceHistory({ points }: FinanceInvoiceHistoryProps) {
  if (points.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-ink-tertiary">
        Nenhuma fatura registrada ainda.
      </p>
    );
  }

  return (
    <section aria-label="Histórico de faturas" className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
        Últimos meses
      </h3>
      <ul className="flex flex-col gap-1">
        {points.map((point) => (
          <li
            key={point.month}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-4 py-2"
          >
            <span className="text-sm font-semibold text-ink-primary">
              {monthLabel(point.month)}
            </span>
            <span className="flex items-center gap-4">
              <Money value={point.amount} className="font-bold" />
              {point.delta !== null && (
                <span
                  aria-label="Variação em relação ao mês anterior"
                  className={`text-sm font-semibold ${variationTone(point.delta)}`}
                >
                  {variationPrefix(point.delta)}
                  <Money value={Math.abs(point.delta)} />
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
