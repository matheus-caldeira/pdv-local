import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';

import './Panel.css';

export function Panel() {
  // Pedidos em preparo (aceito + em_preparo).
  const preparing =
    useLiveQuery(() =>
      db.orders
        .where('stage')
        .anyOf('aceito', 'em_preparo')
        .filter((o) => o.status !== 'cancelled')
        .toArray(),
    ) ?? [];

  // Pedidos saindo para entrega (a_caminho).
  const onTheWay =
    useLiveQuery(() =>
      db.orders
        .where('stage')
        .equals('a_caminho')
        .filter((o) => o.status !== 'cancelled')
        .toArray(),
    ) ?? [];

  const sortedPreparing = [...preparing].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
  const sortedOnTheWay = [...onTheWay].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  return (
    <div className="panel-page">
      <div className="panel-col">
        <div className="panel-col-title">Em preparo</div>
        {sortedPreparing.length === 0 ? (
          <div className="panel-empty">Nenhum pedido em preparo</div>
        ) : (
          sortedPreparing.map((o) => (
            <div key={o.id} className="panel-item">
              <span className="panel-item-ticket">#{o.ticket}</span>
              {o.customerName && (
                <span className="panel-item-name">{o.customerName}</span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="panel-col">
        <div className="panel-col-title">A caminho</div>
        {sortedOnTheWay.length === 0 ? (
          <div className="panel-empty">Nenhum pedido a caminho</div>
        ) : (
          sortedOnTheWay.map((o) => (
            <div key={o.id} className="panel-item ready">
              <span className="panel-item-ticket">#{o.ticket}</span>
              {o.customerName && (
                <span className="panel-item-name">{o.customerName}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
