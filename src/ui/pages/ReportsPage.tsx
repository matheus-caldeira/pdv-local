import { Badge } from '../atoms/Badge';
import { Money } from '../atoms/Money';
import { SalesSummaryCards } from '../organisms/SalesSummaryCards';
import { ProductRankingList } from '../organisms/ProductRankingList';
import { useReports } from '../hooks/useReports';
import { formatDate, formatTime } from '../../domain/shared/format';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Credito',
  debito: 'Debito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
  outros: 'outros',
};

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

export function ReportsPage() {
  const { sessions, selectedSessionId, select, report } = useReports();

  const currentSession = sessions.find((s) => s.id === selectedSessionId);
  const summary = report?.summary ?? null;
  const byMethod = report?.byMethod ?? {};
  const products = report?.products ?? [];
  const pending = report?.pending ?? [];
  const totalSales = summary?.totalSales ?? 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Relatorios</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Nenhuma sessao encontrada
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
              Sessao
            </h3>
            <div className="flex flex-wrap gap-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={selectedSessionId === s.id}
                  onClick={() => select(s.id!)}
                  className={
                    selectedSessionId === s.id
                      ? 'rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-text'
                      : 'rounded-full border border-border-emphasis bg-surface-2 px-3 py-1 text-sm font-semibold text-ink-secondary hover:bg-surface-inset'
                  }
                >
                  {formatDate(s.openedAt)}
                  {s.closedAt === null && ' (ativa)'}
                </button>
              ))}
            </div>
          </div>

          {currentSession && (
            <div className="text-sm text-ink-tertiary">
              {formatDate(currentSession.openedAt)}{' '}
              {formatTime(currentSession.openedAt)}
              {currentSession.closedAt !== null &&
                ` — ${formatTime(currentSession.closedAt)}`}
            </div>
          )}

          <SalesSummaryCards
            cards={[
              {
                label: 'Total Vendas',
                value: <Money value={totalSales} />,
                highlight: true,
              },
              {
                label: 'Pedidos Pagos',
                value: (
                  <span className="font-mono tabular-nums">
                    {summary?.paidCount ?? 0}
                  </span>
                ),
              },
              {
                label: 'Lucro Bruto',
                value: <Money value={summary?.profit ?? 0} />,
              },
              {
                label: 'Margem',
                value: (
                  <span className="font-mono tabular-nums">
                    {(summary?.margin ?? 0).toFixed(1)}%
                  </span>
                ),
              },
            ]}
          />

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
              Por Forma de Pagamento
            </h3>
            {Object.keys(byMethod).length === 0 ? (
              <div className="py-6 text-center text-sm text-ink-tertiary">
                Nenhuma venda ainda
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {Object.entries(byMethod).map(([method, total]) => {
                  const pct = totalSales > 0 ? (total / totalSales) * 100 : 0;
                  return (
                    <div
                      key={method}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-2"
                    >
                      <span className="w-24 shrink-0 text-sm text-ink-secondary">
                        {paymentLabel(method)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-ink-tertiary">
                        {pct.toFixed(0)}%
                      </span>
                      <Money
                        value={total}
                        className="w-24 shrink-0 text-right font-bold"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
              Por Produto
            </h3>
            <ProductRankingList
              products={products}
              emptyLabel="Nenhuma venda ainda"
            />
          </div>

          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
                Pedidos Pendentes
              </h3>
              <div className="flex flex-col gap-1">
                {pending.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2"
                  >
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="font-mono font-bold tabular-nums text-ink-primary">
                        #{order.ticket}
                      </span>
                      {order.customerName && (
                        <span className="truncate text-sm text-ink-secondary">
                          {order.customerName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        tone={order.status === 'open' ? 'info' : 'warning'}
                        size="xs"
                        uppercase
                      >
                        {order.status === 'open' ? 'Aberto' : 'Pendente'}
                      </Badge>
                      <Money value={order.total} className="font-bold" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
