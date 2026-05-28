import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Clock, Wallet } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Money } from '../atoms/Money';
import { SalesSummaryCards } from '../organisms/SalesSummaryCards';
import { ProductRankingList } from '../organisms/ProductRankingList';
import { useSession } from '../hooks/useSession';
import { useDashboard } from '../hooks/useDashboard';
import { formatTime } from '../../domain/shared/format';
import type { OrderStatus } from '../../domain/order/order.entity';

const STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'Aberto',
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
};

const STATUS_TONES: Record<
  OrderStatus,
  'info' | 'success' | 'warning' | 'danger'
> = {
  open: 'info',
  paid: 'success',
  pending: 'warning',
  cancelled: 'danger',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { activeSession, loading } = useSession();
  const { data } = useDashboard(activeSession?.id);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-ink-tertiary">
        Carregando...
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface-2 px-6 py-10 text-center text-ink-tertiary">
        <Wallet size={48} />
        <h2 className="text-lg font-bold tracking-tight text-ink-primary">
          Nenhuma sessao aberta
        </h2>
        <p className="text-sm">
          Abra uma sessao de caixa para comecar a vender.
        </p>
        <Button fullWidth onClick={() => navigate('/cash')}>
          Abrir Caixa
        </Button>
      </div>
    );
  }

  const summary = data?.summary ?? null;
  const topProducts = data?.topProducts ?? [];
  const recent = data?.recent ?? [];

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Painel</h1>
          <span className="flex items-center gap-2 text-sm font-semibold text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            Sessao aberta desde {formatTime(activeSession.openedAt)}
          </span>
        </div>
        <Button onClick={() => navigate('/pdv')}>
          <ShoppingCart size={18} /> Nova Venda
        </Button>
      </div>

      <SalesSummaryCards
        cards={[
          {
            label: 'Vendas da sessao',
            value: <Money value={summary?.totalSales ?? 0} />,
            highlight: true,
          },
          {
            label: 'Pedidos pagos',
            value: (
              <span className="font-mono tabular-nums">
                {summary?.paidCount ?? 0}
              </span>
            ),
          },
          {
            label: 'Em aberto',
            value: (
              <span className="font-mono tabular-nums">
                {data?.openCount ?? 0}
              </span>
            ),
          },
        ]}
      />

      <div className="mt-6 flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          <TrendingUp size={14} /> Top Produtos
        </h3>
        <ProductRankingList
          products={topProducts}
          emptyLabel="Nenhuma venda ainda"
        />
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          <Clock size={14} /> Ultimos Pedidos
        </h3>
        {recent.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-tertiary">
            Nenhum pedido
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {recent.map((order) => (
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
                  <Badge tone={STATUS_TONES[order.status]} size="xs" uppercase>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  <Money value={order.total} className="font-bold" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
