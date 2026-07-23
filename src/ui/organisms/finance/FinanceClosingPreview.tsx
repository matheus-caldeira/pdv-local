import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Money } from '../../atoms/Money';
import { formatDateTime } from '../../../domain/shared/format';
import type { ClosingPreview } from '../../../application/finance/closing.usecases';
import type { MonthInvoiceLine } from '../../../application/finance/invoices.usecases';
import type {
  FinanceKind,
  MonthClosing,
} from '../../../domain/finance/finance.entity';

interface ClosingSummaryData {
  plannedIncome: number;
  plannedExpense: number;
  plannedBalance: number;
  actualIncome: number;
  actualExpense: number;
  actualBalance: number;
  categories: {
    categoryUid: string;
    name: string;
    kind: FinanceKind;
    budgeted: number;
    actual: number;
  }[];
}

interface FinanceClosingPreviewProps {
  monthLabel: string;
  preview: ClosingPreview;
  closing: MonthClosing | null;
  invoices: MonthInvoiceLine[];
  isFutureMonth: boolean;
  onRequestClose(): void;
  onRequestReopen(): void;
}

function InvoiceLines({ invoices }: { invoices: MonthInvoiceLine[] }) {
  if (invoices.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
        Faturas que vencem no mês
      </h3>
      <ul aria-label="Faturas do mês" className="flex flex-col gap-1">
        {invoices.map((invoice) => (
          <li
            key={invoice.uid}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-4 py-2"
          >
            <span className="text-sm font-semibold text-ink-primary">
              {invoice.cardName}
            </span>
            <span className="flex items-center gap-3">
              <Money value={invoice.amount} className="font-bold" />
              <Badge tone={invoice.status === 'paid' ? 'success' : 'warning'}>
                {invoice.status === 'paid' ? 'Paga' : 'Pendente'}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryTotals({ summary }: { summary: ClosingSummaryData }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
        <span className="text-xs font-semibold text-ink-tertiary">
          Entradas
        </span>
        <span className="text-sm text-ink-secondary">
          Orçado <Money value={summary.plannedIncome} className="font-bold" />
        </span>
        <span className="text-sm text-success">
          Real <Money value={summary.actualIncome} className="font-bold" />
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3">
        <span className="text-xs font-semibold text-ink-tertiary">Saídas</span>
        <span className="text-sm text-ink-secondary">
          Orçado <Money value={summary.plannedExpense} className="font-bold" />
        </span>
        <span className="text-sm text-danger">
          Real <Money value={summary.actualExpense} className="font-bold" />
        </span>
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-border-emphasis bg-surface-inset px-4 py-3">
        <span className="text-xs font-semibold text-ink-secondary">Saldo</span>
        <span className="text-sm text-ink-secondary">
          Previsto{' '}
          <Money value={summary.plannedBalance} className="font-bold" />
        </span>
        <span className="text-sm text-ink-primary">
          Real{' '}
          <Money value={summary.actualBalance} className="font-extrabold" />
        </span>
      </div>
    </div>
  );
}

function CategoryLines({
  categories,
}: {
  categories: ClosingSummaryData['categories'];
}) {
  return (
    <ul aria-label="Detalhe por categoria" className="flex flex-col gap-1">
      {categories.map((line) => (
        <li
          key={line.categoryUid}
          className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-2 md:flex-row md:items-center md:justify-between"
        >
          <span
            className={
              line.kind === 'income'
                ? 'text-sm font-semibold text-success'
                : 'text-sm font-semibold text-danger'
            }
          >
            {line.name}
          </span>
          <span className="flex items-center gap-4 text-sm text-ink-secondary">
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
  );
}

export function FinanceClosingPreview({
  monthLabel,
  preview,
  closing,
  invoices,
  isFutureMonth,
  onRequestClose,
  onRequestReopen,
}: FinanceClosingPreviewProps) {
  if (closing) {
    return (
      <section
        aria-label={`Fechamento de ${monthLabel}`}
        className="flex flex-col gap-3"
      >
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {monthLabel} está fechado
          </h2>
          <p className="text-sm text-ink-tertiary">
            Fechado em {formatDateTime(closing.closedAt)}. Este é o resumo
            congelado no fechamento.
          </p>
        </div>
        <SummaryTotals summary={closing} />
        <CategoryLines categories={closing.categories} />
        <InvoiceLines invoices={invoices} />
        <Button variant="ghost" onClick={onRequestReopen}>
          Reabrir mês
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label={`Fechamento de ${monthLabel}`}
      className="flex flex-col gap-3"
    >
      <h2 className="text-lg font-bold tracking-tight">Fechar {monthLabel}</h2>
      <SummaryTotals summary={preview.summary} />
      <CategoryLines categories={preview.summary.categories} />
      <InvoiceLines invoices={invoices} />
      {preview.pendingEntries.length > 0 && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-warning bg-warning-subtle px-4 py-3"
        >
          <span className="text-sm font-bold text-ink-primary">
            Lançamentos pendentes em {monthLabel}
          </span>
          <ul className="flex flex-col gap-1">
            {preview.pendingEntries.map((entry) => (
              <li
                key={entry.uid}
                className="flex items-center justify-between text-sm text-ink-secondary"
              >
                <span>{entry.description}</span>
                <Money value={entry.amount} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-secondary">
            Estes lançamentos continuam pendentes e poderão ser pagos depois do
            fechamento.
          </p>
        </div>
      )}
      {isFutureMonth && (
        <p className="text-sm text-ink-tertiary">
          Não é possível fechar um mês futuro. Aguarde o início do mês para
          fechá-lo.
        </p>
      )}
      <Button disabled={isFutureMonth} onClick={onRequestClose}>
        Fechar mês
      </Button>
    </section>
  );
}
