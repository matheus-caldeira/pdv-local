import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { IconButton } from '../../atoms/IconButton';
import { Money } from '../../atoms/Money';
import { TextField } from '../../molecules/TextField';
import { cn } from '../../lib/cn';
import { round2 } from '../../../domain/finance/finance.rules';
import type { FinanceKind } from '../../../domain/finance/finance.entity';
import type { BudgetLineView } from '../../../application/finance/budget.usecases';

interface FinanceBudgetTableProps {
  lines: BudgetLineView[];
  monthLocked: boolean;
  onSaveTemplate(categoryUid: string, amount: number): void;
  onSaveOverride(categoryUid: string, amount: number): void;
  onRemoveOverride(categoryUid: string, overrideAmount: number): void;
}

interface AmountInputProps {
  label: string;
  value: number | null;
  disabled?: boolean;
  onCommit(amount: number): void;
}

function toDraft(value: number | null): string {
  return value === null ? '' : String(value);
}

function AmountInput({ label, value, disabled, onCommit }: AmountInputProps) {
  const [draft, setDraft] = useState(toDraft(value));

  useEffect(() => {
    setDraft(toDraft(value));
  }, [value]);

  function commit() {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(toDraft(value));
      return;
    }
    if (parsed === value) return;
    onCommit(parsed);
  }

  return (
    <TextField
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      aria-label={label}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

const KIND_LABELS: Record<FinanceKind, string> = {
  income: 'Entradas',
  expense: 'Saídas',
};

const ROW_GRID =
  'md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,7.5rem))] md:items-center';

function difference(line: BudgetLineView): number {
  return line.kind === 'income'
    ? round2(line.actual - line.amount)
    : round2(line.amount - line.actual);
}

function differenceClass(diff: number): string {
  if (diff > 0) return 'text-success';
  if (diff < 0) return 'text-danger';
  return 'text-ink-tertiary';
}

export function FinanceBudgetTable({
  lines,
  monthLocked,
  onSaveTemplate,
  onSaveOverride,
  onRemoveOverride,
}: FinanceBudgetTableProps) {
  const groups = (['income', 'expense'] as const)
    .map((kind) => ({
      kind,
      lines: lines.filter((line) => line.kind === kind),
    }))
    .filter((group) => group.lines.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section
          key={group.kind}
          aria-label={KIND_LABELS[group.kind]}
          className="flex flex-col gap-2"
        >
          <h2 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            {KIND_LABELS[group.kind]}
          </h2>
          <div
            className={cn(
              'grid gap-2 px-4 text-xs font-semibold text-ink-tertiary max-md:hidden',
              ROW_GRID,
            )}
          >
            <span>Categoria</span>
            <span>Modelo</span>
            <span>Mês</span>
            <span>Real</span>
            <span>Diferença</span>
          </div>
          <div className="flex flex-col gap-1">
            {group.lines.map((line) => {
              const diff = difference(line);
              return (
                <div
                  key={line.categoryUid}
                  className={cn(
                    'grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-2 px-4 py-3',
                    ROW_GRID,
                  )}
                >
                  <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                    <span className="text-sm font-semibold text-ink-primary">
                      {line.name}
                    </span>
                    {line.fromOverride && (
                      <>
                        <Badge tone="info" size="xs">
                          Ajustado
                        </Badge>
                        <IconButton
                          aria-label={`Voltar ${line.name} ao modelo`}
                          disabled={monthLocked}
                          onClick={() =>
                            onRemoveOverride(line.categoryUid, line.amount)
                          }
                        >
                          <Undo2 size={14} />
                        </IconButton>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-tertiary md:hidden">
                      Modelo
                    </span>
                    <AmountInput
                      label={`Modelo de ${line.name}`}
                      value={line.templateAmount}
                      onCommit={(amount) =>
                        onSaveTemplate(line.categoryUid, amount)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-tertiary md:hidden">
                      Mês
                    </span>
                    <AmountInput
                      label={`Valor de ${line.name} no mês`}
                      value={line.amount}
                      disabled={monthLocked}
                      onCommit={(amount) =>
                        onSaveOverride(line.categoryUid, amount)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-tertiary md:hidden">
                      Real
                    </span>
                    <Money value={line.actual} className="text-sm font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-ink-tertiary md:hidden">
                      Diferença
                    </span>
                    <Money
                      value={diff}
                      className={cn('text-sm font-bold', differenceClass(diff))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
