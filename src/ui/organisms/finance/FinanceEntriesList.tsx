import { CheckCircle2, Inbox, Pencil, Undo2 } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { IconButton } from '../../atoms/IconButton';
import { Money } from '../../atoms/Money';
import { formatDate } from '../../../domain/shared/format';
import type {
  FinanceCategory,
  FinanceEntry,
  MonthKey,
} from '../../../domain/finance/finance.entity';

interface FinanceEntriesListProps {
  entries: FinanceEntry[];
  categories: FinanceCategory[];
  planCounts: Record<string, number>;
  closedMonths: MonthKey[];
  onEdit(entry: FinanceEntry): void;
  onToggleStatus(entry: FinanceEntry): void;
}

function sourceLabel(
  entry: FinanceEntry,
  planCounts: Record<string, number>,
): string | null {
  if (entry.source === 'installment') {
    const total = planCounts[entry.sourceUid ?? ''];
    return total
      ? `Parcela ${entry.installmentNumber}/${total}`
      : `Parcela ${entry.installmentNumber}`;
  }
  if (entry.source === 'recurrence') return 'Recorrência';
  if (entry.source === 'formula') return 'Fórmula';
  return null;
}

function categoryName(
  categories: FinanceCategory[],
  categoryUid: string,
): string {
  return (
    categories.find((category) => category.uid === categoryUid)?.name ??
    'Sem categoria'
  );
}

function statusToggleLabel(entry: FinanceEntry): string {
  return entry.status === 'paid'
    ? `Marcar "${entry.description}" como pendente`
    : `Marcar "${entry.description}" como pago`;
}

function EntryActions({
  entry,
  editDisabled,
  onEdit,
  onToggleStatus,
}: {
  entry: FinanceEntry;
  editDisabled: boolean;
  onEdit(entry: FinanceEntry): void;
  onToggleStatus(entry: FinanceEntry): void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label={statusToggleLabel(entry)}
        onClick={() => onToggleStatus(entry)}
      >
        {entry.status === 'paid' ? (
          <Undo2 size={14} />
        ) : (
          <CheckCircle2 size={14} />
        )}
      </IconButton>
      <IconButton
        aria-label={`Editar "${entry.description}"`}
        disabled={editDisabled}
        className="disabled:opacity-40 disabled:pointer-events-none"
        onClick={() => onEdit(entry)}
      >
        <Pencil size={14} />
      </IconButton>
    </div>
  );
}

function EntryAmount({ entry }: { entry: FinanceEntry }) {
  return (
    <span
      className={
        entry.kind === 'income'
          ? 'font-bold text-success'
          : 'font-bold text-danger'
      }
    >
      {entry.kind === 'income' ? '+ ' : '- '}
      <Money value={entry.amount} />
    </span>
  );
}

function EntryBadges({
  entry,
  planCounts,
}: {
  entry: FinanceEntry;
  planCounts: Record<string, number>;
}) {
  const source = sourceLabel(entry, planCounts);
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={entry.status === 'paid' ? 'success' : 'warning'} size="xs">
        {entry.status === 'paid' ? 'Pago' : 'Pendente'}
      </Badge>
      {source && (
        <Badge tone="info" size="xs">
          {source}
        </Badge>
      )}
    </span>
  );
}

export function FinanceEntriesList({
  entries,
  categories,
  planCounts,
  closedMonths,
  onEdit,
  onToggleStatus,
}: FinanceEntriesListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-tertiary">
        <Inbox size={32} />
        <p>Nenhum lançamento encontrado</p>
      </div>
    );
  }

  return (
    <>
      <ul aria-label="Lançamentos" className="flex flex-col gap-2 md:hidden">
        {entries.map((entry) => (
          <li
            key={entry.uid}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">
                  {entry.description}
                </span>
                <EntryBadges entry={entry} planCounts={planCounts} />
              </div>
              <div className="text-xs text-ink-tertiary">
                {categoryName(categories, entry.categoryUid)} ·{' '}
                {formatDate(entry.date)}
              </div>
              <EntryAmount entry={entry} />
            </div>
            <EntryActions
              entry={entry}
              editDisabled={closedMonths.includes(entry.month)}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          </li>
        ))}
      </ul>
      <table className="w-full border-separate border-spacing-0 text-sm max-md:hidden">
        <thead>
          <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-tertiary">
            <th className="border-b border-border px-3 py-2">Descrição</th>
            <th className="border-b border-border px-3 py-2">Categoria</th>
            <th className="border-b border-border px-3 py-2">Data</th>
            <th className="border-b border-border px-3 py-2 text-right">
              Valor
            </th>
            <th className="border-b border-border px-3 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.uid}>
              <td className="border-b border-border px-3 py-2">
                <span className="mr-2 font-semibold">{entry.description}</span>
                <EntryBadges entry={entry} planCounts={planCounts} />
              </td>
              <td className="border-b border-border px-3 py-2 text-ink-secondary">
                {categoryName(categories, entry.categoryUid)}
              </td>
              <td className="border-b border-border px-3 py-2 text-ink-secondary">
                {formatDate(entry.date)}
              </td>
              <td className="border-b border-border px-3 py-2 text-right">
                <EntryAmount entry={entry} />
              </td>
              <td className="border-b border-border px-3 py-2">
                <EntryActions
                  entry={entry}
                  editDisabled={closedMonths.includes(entry.month)}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
