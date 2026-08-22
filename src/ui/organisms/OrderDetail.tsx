import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { QtyStepper } from '../atoms/QtyStepper';
import { Modal } from '../molecules/Modal';
import { formatDateTime } from '../../domain/shared/format';
import { calculateOrderTotal } from '../../domain/order/order.rules';
import type {
  Order,
  OrderItem,
  OrderStatus,
} from '../../domain/order/order.entity';

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

const PAYMENT_METHODS = ['pix', 'credito', 'debito', 'dinheiro'];

interface OrderDetailProps {
  order: Order;
  onPrint: () => void;
  onMarkPaid: (method: string) => void;
  onCancel: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onAddItems?: () => void;
  onSaveItems?: (items: OrderItem[]) => void;
}

export function OrderDetail({
  order,
  onPrint,
  onMarkPaid,
  onCancel,
  onClose,
  onReopen,
  onAddItems,
  onSaveItems,
}: OrderDetailProps) {
  const [payMethodOpen, setPayMethodOpen] = useState(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [draftItems, setDraftItems] = useState(order.items);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const canSettle = order.status === 'open' || order.status === 'pending';
  const isOpenTab = order.status === 'open';
  const isClosedTab = order.status === 'pending';
  const canEdit = isOpenTab && onSaveItems !== undefined;
  const isDirty = JSON.stringify(draftItems) !== JSON.stringify(order.items);
  const displayedTotal = canEdit
    ? calculateOrderTotal(draftItems)
    : order.total;

  useEffect(() => {
    setDraftItems(order.items);
  }, [order]);

  function decrementItem(index: number) {
    const item = draftItems[index];
    if (item.qty === 1) {
      setRemovingIndex(index);
      return;
    }
    setDraftItems((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, qty: entry.qty - 1 } : entry,
      ),
    );
  }

  function incrementItem(index: number) {
    setDraftItems((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, qty: entry.qty + 1 } : entry,
      ),
    );
  }

  function confirmRemoveItem() {
    setDraftItems((current) =>
      current.filter((_, entryIndex) => entryIndex !== removingIndex),
    );
    setRemovingIndex(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-inset px-4 py-3">
        <div className="flex items-center justify-between">
          <Badge tone={STATUS_TONES[order.status]} uppercase>
            {STATUS_LABELS[order.status]}
          </Badge>
          <span className="text-xs text-ink-muted">
            {formatDateTime(order.createdAt)}
          </span>
        </div>
        {order.customerName && (
          <div className="font-semibold text-ink-primary">
            {order.customerName}
          </div>
        )}
        <div className="text-sm text-ink-tertiary">
          {order.paymentMethod
            ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod)
            : 'Sem pagamento'}
        </div>
        {order.closedAt && (
          <div className="text-xs text-ink-muted">
            Fechada em {formatDateTime(order.closedAt)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Itens
        </h3>
        {draftItems.map((item, index) => {
          const unitTotal = item.salePrice + (item.customizationTotal ?? 0);
          return (
            <div
              key={index}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-primary">
                  <span className="font-mono tabular-nums">{item.qty}x</span>{' '}
                  {item.name}
                </span>
                <div className="flex items-center gap-3">
                  {canEdit && (
                    <QtyStepper
                      qty={item.qty}
                      onDecrement={() => decrementItem(index)}
                      onIncrement={() => incrementItem(index)}
                      size="sm"
                    />
                  )}
                  <Money value={unitTotal * item.qty} className="font-bold" />
                </div>
              </div>

              {item.customizations && item.customizations.length > 0 && (
                <div className="flex flex-col gap-0.5 text-sm text-ink-secondary">
                  {item.customizations.map((customization, itemIndex) => (
                    <div key={itemIndex}>
                      <span className="text-ink-tertiary">
                        {customization.groupName}:
                      </span>{' '}
                      <span>
                        {customization.qty > 1 ? `${customization.qty}x ` : ''}
                        {customization.name}
                        {customization.price > 0 && (
                          <span className="text-ink-tertiary">
                            {' '}
                            (+
                            <Money value={customization.price} />)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {item.observation && (
                <div className="text-sm italic text-ink-tertiary">
                  {item.observation}
                </div>
              )}

              {(item.customizationTotal ?? 0) > 0 && (
                <div className="flex justify-between text-xs text-ink-muted">
                  <span>
                    Produto: <Money value={item.salePrice} />
                  </span>
                  <span>
                    Adicionais: +<Money value={item.customizationTotal!} />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md border border-border-emphasis bg-surface-inset px-4 py-3">
        <span className="font-semibold text-ink-secondary">Total</span>
        <Money value={displayedTotal} className="text-xl font-extrabold" />
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="ghost" fullWidth onClick={onPrint}>
          <Printer size={16} /> Imprimir
        </Button>
        {canEdit && (
          <Button
            fullWidth
            disabled={!isDirty}
            onClick={() => onSaveItems?.(draftItems)}
          >
            Salvar alterações
          </Button>
        )}
        {isOpenTab && (
          <>
            <Button variant="ghost" fullWidth onClick={onAddItems}>
              Adicionar itens
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>
              Fechar comanda
            </Button>
          </>
        )}
        {isClosedTab && (
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setReopenConfirmOpen(true)}
          >
            Reabrir
          </Button>
        )}
        {canSettle && (
          <>
            <Button fullWidth onClick={() => setPayMethodOpen(true)}>
              Marcar como Pago
            </Button>
            <Button variant="danger" fullWidth onClick={onCancel}>
              Cancelar Pedido
            </Button>
          </>
        )}
      </div>

      <Modal
        open={payMethodOpen}
        onClose={() => setPayMethodOpen(false)}
        title="Forma de Pagamento"
      >
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => (
            <Button
              key={method}
              variant="ghost"
              onClick={() => {
                setPayMethodOpen(false);
                onMarkPaid(method);
              }}
            >
              {PAYMENT_LABELS[method]}
            </Button>
          ))}
        </div>
      </Modal>

      <Modal
        open={reopenConfirmOpen}
        onClose={() => setReopenConfirmOpen(false)}
        title="Reabrir comanda"
      >
        <p className="text-sm text-ink-secondary">
          Reabrir a comanda {order.ticket} para incluir mais itens?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setReopenConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setReopenConfirmOpen(false);
              onReopen?.();
            }}
          >
            Reabrir
          </Button>
        </div>
      </Modal>

      <Modal
        open={removingIndex !== null}
        onClose={() => setRemovingIndex(null)}
        title="Remover item"
      >
        <p className="text-sm text-ink-secondary">
          Remover {removingIndex !== null && draftItems[removingIndex].name} da
          comanda?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemovingIndex(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmRemoveItem}>
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  );
}
