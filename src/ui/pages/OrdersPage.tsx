import { useMemo, useState } from 'react';
import { Badge } from '../atoms/Badge';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { SearchField } from '../molecules/SearchField';
import { useToast } from '../molecules/toast-context';
import { OrderDetail } from '../organisms/OrderDetail';
import { useOrders } from '../hooks/useOrders';
import { formatDateTime } from '../../domain/shared/format';
import { STAGE_LABELS } from '../../domain/order/order.rules';
import type { Order, OrderStatus } from '../../domain/order/order.entity';

const STATUS_OPTIONS: { key: OrderStatus | ''; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'open', label: 'Abertos' },
  { key: 'paid', label: 'Pagos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'cancelled', label: 'Cancelados' },
];

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

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Credito',
  debito: 'Debito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
};

export function OrdersPage() {
  const toast = useToast();
  const { orders, statusControlEnabled, markPaid, cancel } = useOrders();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!term) return true;
      return (
        order.ticket.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term)
      );
    });
  }, [orders, search, statusFilter]);

  function handlePrint() {
    toast('Configure a impressora em Config > Impressora (ESC/POS)', 'info');
  }

  async function handleMarkPaid(method: string) {
    const ok = await markPaid(detailOrder!.id!, method);
    if (ok) setDetailOrder(null);
  }

  async function handleCancel() {
    if (!window.confirm('Cancelar este pedido?')) return;
    const ok = await cancel(detailOrder!.id!);
    if (ok) setDetailOrder(null);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Pedidos</h1>
        <span className="text-sm text-ink-tertiary">
          {filtered.length} pedidos
        </span>
      </div>

      <div className="mb-3">
        <SearchField
          aria-label="Buscar pedidos"
          placeholder="Buscar por comanda ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={statusFilter === option.key}
            onClick={() => setStatusFilter(option.key)}
            className={
              statusFilter === option.key
                ? 'rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-text'
                : 'rounded-full border border-border-emphasis bg-surface-2 px-3 py-1 text-sm font-semibold text-ink-secondary hover:bg-surface-inset'
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Nenhum pedido encontrado
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setDetailOrder(order)}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-surface-inset"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-bold tabular-nums text-ink-primary">
                    #{order.ticket}
                  </span>
                  {order.customerName && (
                    <span className="text-sm text-ink-secondary">
                      {order.customerName}
                    </span>
                  )}
                </div>
                <Money value={order.total} className="font-bold" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-tertiary">
                  <Badge tone={STATUS_TONES[order.status]} size="xs" uppercase>
                    {STATUS_LABELS[order.status]}
                  </Badge>
                  {statusControlEnabled && order.stage && (
                    <Badge tone="muted" size="xs" uppercase>
                      {STAGE_LABELS[order.stage]}
                    </Badge>
                  )}
                  <span>
                    {order.paymentMethod
                      ? (PAYMENT_LABELS[order.paymentMethod] ??
                        order.paymentMethod)
                      : '-'}
                  </span>
                  <span>
                    {order.items.length}{' '}
                    {order.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <span className="text-xs text-ink-muted">
                  {formatDateTime(order.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={detailOrder !== null}
        onClose={() => setDetailOrder(null)}
        title={`Pedido #${detailOrder?.ticket ?? ''}`}
      >
        {detailOrder && (
          <OrderDetail
            order={detailOrder}
            onPrint={handlePrint}
            onMarkPaid={handleMarkPaid}
            onCancel={handleCancel}
          />
        )}
      </Modal>
    </div>
  );
}
