import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleDollarSign,
  MoreVertical,
  Printer,
  ShoppingCart,
} from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { IconButton } from '../atoms/IconButton';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { SearchField } from '../molecules/SearchField';
import { OrderDetail } from '../organisms/OrderDetail';
import { useOrders } from '../hooks/useOrders';
import { usePrint } from '../hooks/usePrint';
import { useSession } from '../hooks/useSession';
import { useTabs } from '../hooks/useTabs';
import { container } from '../../app/container';
import { isLeft } from '../../domain/shared/either';
import { formatDateTime } from '../../domain/shared/format';
import { STAGE_LABELS } from '../../domain/order/order.rules';
import type {
  Order,
  OrderItem,
  OrderStatus,
} from '../../domain/order/order.entity';

const STATUS_OPTIONS: { key: OrderStatus; label: string }[] = [
  { key: 'open', label: 'Abertos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'paid', label: 'Pagos' },
  { key: 'cancelled', label: 'Cancelados' },
];

const ALL_STATUSES = STATUS_OPTIONS.map((option) => option.key);

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
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
};

const QUICK_PAYMENT_METHODS = ['pix', 'credito', 'debito', 'dinheiro'];

export function OrdersPage() {
  const navigate = useNavigate();
  const { activeSession } = useSession();
  const {
    orders,
    statuses,
    setStatuses,
    term,
    setTerm,
    total,
    hasMore,
    loading,
    loadMore,
    statusControlEnabled,
    markPaid,
    cancel,
  } = useOrders();
  const { updateItems, closeTab, reopenTab } = useTabs(
    activeSession?.uid ?? '',
  );
  const { printOrder } = usePrint();
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const autoPrintOnCloseRef = useRef(false);

  useEffect(() => {
    async function load() {
      const result = await container.readConfig();
      if (isLeft(result)) return;
      autoPrintOnCloseRef.current = result.right.printerAutoPrintOnClose;
    }
    load();
  }, []);

  const allSelected = statuses.length === ALL_STATUSES.length;

  function toggleStatus(status: OrderStatus) {
    setStatuses(
      statuses.includes(status)
        ? statuses.filter((current) => current !== status)
        : [...statuses, status],
    );
  }

  async function handleMarkPaid(method: string) {
    const ok = await markPaid(detailOrder!.uid, method);
    if (ok) setDetailOrder(null);
  }

  async function handleCancel() {
    if (!window.confirm('Cancelar este pedido?')) return;
    const ok = await cancel(detailOrder!.uid);
    if (ok) setDetailOrder(null);
  }

  async function handleCloseTab() {
    const order = detailOrder!;
    const ok = await closeTab(order.uid);
    if (!ok) return;
    if (autoPrintOnCloseRef.current) await printOrder(order);
    setDetailOrder(null);
  }

  async function handleReopenTab() {
    const ok = await reopenTab(detailOrder!.uid);
    if (ok) setDetailOrder(null);
  }

  function handleAddItems() {
    navigate('/pdv?tab=' + detailOrder!.uid);
  }

  async function handleSaveItems(items: OrderItem[]) {
    const ok = await updateItems(detailOrder!.uid, items);
    if (ok) setDetailOrder(null);
  }

  async function handleQuickPay(method: string) {
    const order = payingOrder!;
    const ok = await markPaid(order.uid, method);
    if (ok) setPayingOrder(null);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Pedidos</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-tertiary">
            {orders.length < total
              ? `${orders.length} de ${total} pedidos`
              : `${total} pedidos`}
          </span>
          <Button size="sm" onClick={() => navigate('/pdv')}>
            Novo pedido
          </Button>
        </div>
      </div>

      <div className="mb-3">
        <SearchField
          aria-label="Buscar pedidos"
          placeholder="Buscar por comanda ou nome..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            aria-pressed={statuses.includes(option.key)}
            onClick={() => toggleStatus(option.key)}
            className={
              statuses.includes(option.key)
                ? 'rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-text'
                : 'rounded-full border border-border-emphasis bg-surface-2 px-3 py-1 text-sm font-semibold text-ink-secondary hover:bg-surface-inset'
            }
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={allSelected}
          onClick={() => setStatuses(ALL_STATUSES)}
          className="rounded-full border border-dashed border-border-emphasis px-3 py-1 text-sm font-semibold text-ink-tertiary hover:bg-surface-inset"
        >
          Todos
        </button>
      </div>

      {statuses.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Selecione ao menos um status
        </div>
      ) : orders.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-tertiary">
          Nenhum pedido encontrado
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <div
              key={order.id}
              data-order={order.uid}
              className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 px-4 py-3 text-left"
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
              <div className="flex items-center justify-end gap-2">
                {order.status === 'open' && (
                  <IconButton
                    aria-label="Continuar"
                    title="Continuar"
                    onClick={() => navigate('/pdv?tab=' + order.uid)}
                  >
                    <ShoppingCart size={15} />
                  </IconButton>
                )}
                <IconButton
                  aria-label="Imprimir"
                  title="Imprimir"
                  onClick={() => printOrder(order)}
                >
                  <Printer size={15} />
                </IconButton>
                {(order.status === 'open' || order.status === 'pending') && (
                  <IconButton
                    aria-label="Marcar como pago"
                    title="Marcar como pago"
                    onClick={() => setPayingOrder(order)}
                  >
                    <CircleDollarSign size={15} />
                  </IconButton>
                )}
                <IconButton
                  aria-label="Mais ações"
                  title="Mais ações"
                  onClick={() => setDetailOrder(order)}
                >
                  <MoreVertical size={15} />
                </IconButton>
              </div>
            </div>
          ))}
          {hasMore && (
            <Button
              variant="ghost"
              className="mt-2 self-center"
              disabled={loading}
              onClick={loadMore}
            >
              Carregar mais
            </Button>
          )}
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
            onPrint={() => printOrder(detailOrder)}
            onMarkPaid={handleMarkPaid}
            onCancel={handleCancel}
            onClose={handleCloseTab}
            onReopen={handleReopenTab}
            onAddItems={handleAddItems}
            onSaveItems={handleSaveItems}
          />
        )}
      </Modal>

      <Modal
        open={payingOrder !== null}
        onClose={() => setPayingOrder(null)}
        title="Marcar como pago"
      >
        <div className="grid grid-cols-2 gap-2">
          {QUICK_PAYMENT_METHODS.map((method) => (
            <Button
              key={method}
              variant="ghost"
              onClick={() => handleQuickPay(method)}
            >
              {PAYMENT_LABELS[method]}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
