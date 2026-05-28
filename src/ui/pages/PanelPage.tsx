import type { Order } from '../../domain/order/order.entity';
import { usePanelOrders } from '../hooks/usePanelOrders';

interface PanelColumnProps {
  title: string;
  empty: string;
  orders: Order[];
}

function PanelColumn({ title, empty, orders }: PanelColumnProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-inset p-4">
      <h2 className="text-lg font-bold tracking-tight text-ink-secondary">
        {title}
      </h2>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-tertiary">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-3"
            >
              <span className="font-mono text-xl font-extrabold tabular-nums text-ink-primary">
                #{order.ticket}
              </span>
              {order.customerName && (
                <span className="text-sm text-ink-secondary">
                  {order.customerName}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PanelPage() {
  const { preparing, onTheWay } = usePanelOrders();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PanelColumn
        title="Em preparo"
        empty="Nenhum pedido em preparo"
        orders={preparing}
      />
      <PanelColumn
        title="A caminho"
        empty="Nenhum pedido a caminho"
        orders={onTheWay}
      />
    </div>
  );
}
