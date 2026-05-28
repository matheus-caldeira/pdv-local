import { useState } from 'react';
import { Printer } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Money } from '../atoms/Money';
import { Modal } from '../molecules/Modal';
import { formatDateTime } from '../../domain/shared/format';
import type { Order, OrderStatus } from '../../domain/order/order.entity';

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

const PAYMENT_METHODS = ['pix', 'credito', 'debito', 'dinheiro'];

interface OrderDetailProps {
  order: Order;
  onPrint: () => void;
  onMarkPaid: (method: string) => void;
  onCancel: () => void;
}

export function OrderDetail({
  order,
  onPrint,
  onMarkPaid,
  onCancel,
}: OrderDetailProps) {
  const [payMethodOpen, setPayMethodOpen] = useState(false);
  const canSettle = order.status === 'open' || order.status === 'pending';

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
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-ink-tertiary">
          Itens
        </h3>
        {order.items.map((item, index) => {
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
                <Money value={unitTotal * item.qty} className="font-bold" />
              </div>

              {item.customizations && item.customizations.length > 0 && (
                <div className="flex flex-col gap-0.5 text-sm text-ink-secondary">
                  {item.customizations.map((group, groupIndex) => (
                    <div key={groupIndex}>
                      <span className="text-ink-tertiary">
                        {group.groupName}:
                      </span>{' '}
                      {group.items.map((customization, itemIndex) => (
                        <span key={itemIndex}>
                          {itemIndex > 0 ? ', ' : ''}
                          {customization.qty > 1
                            ? `${customization.qty}x `
                            : ''}
                          {customization.name}
                          {customization.price > 0 && (
                            <span className="text-ink-tertiary">
                              {' '}
                              (+
                              <Money value={customization.price} />)
                            </span>
                          )}
                        </span>
                      ))}
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
        <Money value={order.total} className="text-xl font-extrabold" />
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="ghost" fullWidth onClick={onPrint}>
          <Printer size={16} /> Imprimir
        </Button>
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
    </div>
  );
}
