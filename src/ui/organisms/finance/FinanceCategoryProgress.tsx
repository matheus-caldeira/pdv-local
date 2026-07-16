import { Money } from '../../atoms/Money';
import { cn } from '../../lib/cn';
import type { CategorySummaryLine } from '../../../domain/finance/finance.rules';

interface FinanceCategoryProgressProps {
  categories: CategorySummaryLine[];
}

function progressPercent(line: CategorySummaryLine): number {
  if (line.budgeted > 0) return Math.round((line.actual / line.budgeted) * 100);
  return 100;
}

function fillToneClass(line: CategorySummaryLine, overBudget: boolean): string {
  if (overBudget) return 'bg-danger';
  return line.kind === 'income' ? 'bg-success' : 'bg-accent';
}

export function FinanceCategoryProgress({
  categories,
}: FinanceCategoryProgressProps) {
  const lines = categories.filter(
    (line) => line.budgeted > 0 || line.actual > 0,
  );
  if (lines.length === 0) return null;

  return (
    <section
      aria-label="Orçado versus real por categoria"
      className="flex flex-col gap-2"
    >
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
        Orçado vs real por categoria
      </h3>
      <div className="flex flex-col gap-2">
        {lines.map((line) => {
          const percent = progressPercent(line);
          const overBudget =
            line.kind === 'expense' && line.actual > line.budgeted;
          return (
            <div
              key={line.categoryUid}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-2"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-ink-primary">
                  {line.name}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    overBudget
                      ? 'font-semibold text-danger'
                      : 'text-ink-tertiary',
                  )}
                >
                  <Money value={line.actual} /> de{' '}
                  <Money value={line.budgeted} />
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={line.name}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-surface-inset"
              >
                <div
                  className={cn(
                    'h-full rounded-full',
                    fillToneClass(line, overBudget),
                  )}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
