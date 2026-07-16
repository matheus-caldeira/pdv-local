import { Money } from '../../atoms/Money';
import type { MonthSummary } from '../../../domain/finance/finance.rules';

interface FinanceSummaryCardsProps {
  currentBalance: number;
  summary: MonthSummary;
}

export function FinanceSummaryCards({
  currentBalance,
  summary,
}: FinanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div className="flex flex-col gap-1 rounded-md border border-border-emphasis bg-surface-inset px-4 py-3">
        <span className="text-xs font-semibold text-ink-secondary">
          Saldo atual
        </span>
        <Money value={currentBalance} className="text-2xl font-extrabold" />
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
        <span className="text-xs font-semibold text-ink-tertiary">
          Entradas do mês
        </span>
        <span className="text-lg font-bold text-success">
          <Money value={summary.actualIncome} />
        </span>
        <span className="text-xs text-ink-tertiary">
          Orçado: <Money value={summary.plannedIncome} />
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
        <span className="text-xs font-semibold text-ink-tertiary">
          Saídas do mês
        </span>
        <span className="text-lg font-bold text-danger">
          <Money value={summary.actualExpense} />
        </span>
        <span className="text-xs text-ink-tertiary">
          Orçado: <Money value={summary.plannedExpense} />
        </span>
      </div>
    </div>
  );
}
