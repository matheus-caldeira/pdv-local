import { useState } from 'react';
import { Button } from '../../atoms/Button';
import { Money } from '../../atoms/Money';
import { formatDateTime } from '../../../domain/shared/format';
import type {
  MonthClosing,
  MonthKey,
} from '../../../domain/finance/finance.entity';

interface FinanceClosingHistoryProps {
  closings: MonthClosing[];
  onRequestReopen(month: MonthKey): void;
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

export function FinanceClosingHistory({
  closings,
  onRequestReopen,
}: FinanceClosingHistoryProps) {
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  if (closings.length === 0) {
    return (
      <p className="text-sm text-ink-tertiary">Nenhum mês fechado ainda.</p>
    );
  }

  return (
    <ul aria-label="Histórico de fechamentos" className="flex flex-col gap-2">
      {closings.map((closing) => {
        const expanded = expandedUid === closing.uid;
        return (
          <li
            key={closing.uid}
            className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-ink-primary">
                  {monthLabel(closing.month)}
                </span>
                <span className="text-xs text-ink-tertiary">
                  Fechado em {formatDateTime(closing.closedAt)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-ink-secondary">
                <span>
                  Saldo previsto <Money value={closing.plannedBalance} />
                </span>
                <span>
                  Saldo real <Money value={closing.actualBalance} />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={expanded}
                  onClick={() => setExpandedUid(expanded ? null : closing.uid)}
                >
                  {expanded ? 'Ocultar detalhes' : 'Detalhes'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestReopen(closing.month)}
                >
                  Reabrir
                </Button>
              </div>
            </div>
            {expanded && (
              <ul
                aria-label={`Categorias de ${monthLabel(closing.month)}`}
                className="flex flex-col gap-1 border-t border-border pt-2"
              >
                {closing.categories.map((line) => (
                  <li
                    key={line.categoryUid}
                    className="flex flex-col gap-1 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <span
                      className={
                        line.kind === 'income'
                          ? 'font-semibold text-success'
                          : 'font-semibold text-danger'
                      }
                    >
                      {line.name}
                    </span>
                    <span className="flex items-center gap-4 text-ink-secondary">
                      <span>
                        Orçado <Money value={line.budgeted} />
                      </span>
                      <span>
                        Real <Money value={line.actual} />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
