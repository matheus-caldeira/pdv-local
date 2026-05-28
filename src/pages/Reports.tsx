import { useState, useEffect } from 'react';
import { db, type Order, type Session } from '../db/database';
import { formatMoney, formatDate, formatTime } from '../utils/format';
import './Reports.css';

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credito: 'Credito',
  debito: 'Debito',
  dinheiro: 'Dinheiro',
  pagar_depois: 'Pagar Depois',
};

export function Reports() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    db.sessions.toArray().then((all) => {
      const sorted = all.sort((a, b) => b.openedAt - a.openedAt);
      setSessions(sorted);
      if (sorted.length > 0) setSelectedSession(sorted[0].id!);
    });
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    db.orders
      .where('sessionId')
      .equals(selectedSession)
      .toArray()
      .then(setOrders);
  }, [selectedSession]);

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const totalSales = paidOrders.reduce((s, o) => s + o.total, 0);
  const totalCost = paidOrders.reduce(
    (s, o) => s + o.items.reduce((c, i) => c + i.costPrice * i.qty, 0),
    0,
  );
  const profit = totalSales - totalCost;
  const margin =
    totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : '0.0';

  // By payment method
  const byMethod: Record<string, number> = {};
  paidOrders.forEach((o) => {
    const m = o.paymentMethod || 'outros';
    byMethod[m] = (byMethod[m] || 0) + o.total;
  });

  // By product
  const byProduct = new Map<
    string,
    { qty: number; total: number; cost: number }
  >();
  paidOrders.forEach((o) => {
    o.items.forEach((item) => {
      const existing = byProduct.get(item.name) || {
        qty: 0,
        total: 0,
        cost: 0,
      };
      existing.qty += item.qty;
      existing.total += item.salePrice * item.qty;
      existing.cost += item.costPrice * item.qty;
      byProduct.set(item.name, existing);
    });
  });
  const productRanking = [...byProduct.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  const currentSession = sessions.find((s) => s.id === selectedSession);

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Relatorios</h1>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-hint" style={{ padding: 'var(--space-10) 0' }}>
          Nenhuma sessao encontrada
        </div>
      ) : (
        <>
          <div className="session-selector">
            <h3 className="section-label">Sessao</h3>
            <div className="category-pills">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  className={`cat-pill ${selectedSession === s.id ? 'active' : ''}`}
                  onClick={() => setSelectedSession(s.id!)}
                >
                  {formatDate(s.openedAt)}
                  {!s.closedAt && ' (ativa)'}
                </button>
              ))}
            </div>
          </div>

          {currentSession && (
            <div className="report-period">
              {formatDate(currentSession.openedAt)}{' '}
              {formatTime(currentSession.openedAt)}
              {currentSession.closedAt &&
                ` — ${formatTime(currentSession.closedAt)}`}
            </div>
          )}

          {/* Summary cards */}
          <div className="report-summary-grid">
            <div className="report-card report-card-main">
              <span className="report-card-value tabular">
                {formatMoney(totalSales)}
              </span>
              <span className="report-card-label">Total Vendas</span>
            </div>
            <div className="report-card">
              <span className="report-card-value tabular">
                {paidOrders.length}
              </span>
              <span className="report-card-label">Pedidos Pagos</span>
            </div>
            <div className="report-card">
              <span className="report-card-value tabular">
                {formatMoney(profit)}
              </span>
              <span className="report-card-label">Lucro Bruto</span>
            </div>
            <div className="report-card">
              <span className="report-card-value tabular">{margin}%</span>
              <span className="report-card-label">Margem</span>
            </div>
          </div>

          {/* By payment */}
          <div className="report-section">
            <h3 className="section-label">Por Forma de Pagamento</h3>
            <div className="report-table">
              {Object.entries(byMethod).map(([method, total]) => {
                const pct =
                  totalSales > 0
                    ? ((total / totalSales) * 100).toFixed(0)
                    : '0';
                return (
                  <div key={method} className="report-table-row">
                    <span className="report-table-name">
                      {PAYMENT_LABELS[method] || method}
                    </span>
                    <div className="report-bar-container">
                      <div
                        className="report-bar"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="report-table-pct">{pct}%</span>
                    <span className="report-table-value tabular">
                      {formatMoney(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By product */}
          <div className="report-section">
            <h3 className="section-label">Por Produto</h3>
            <div className="report-table">
              {productRanking.map((p, i) => (
                <div key={p.name} className="report-table-row">
                  <span className="report-rank">{i + 1}</span>
                  <span className="report-table-name">{p.name}</span>
                  <span className="report-table-qty">{p.qty}x</span>
                  <span className="report-table-value tabular">
                    {formatMoney(p.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending orders */}
          {orders.filter((o) => o.status === 'pending' || o.status === 'open')
            .length > 0 && (
            <div className="report-section">
              <h3 className="section-label">Pedidos Pendentes</h3>
              <div className="report-table">
                {orders
                  .filter((o) => o.status === 'pending' || o.status === 'open')
                  .map((o) => (
                    <div key={o.id} className="report-table-row">
                      <span className="report-table-name">
                        #{o.ticket} {o.customerName}
                      </span>
                      <span className={`status-badge status-${o.status}`}>
                        {o.status === 'open' ? 'Aberto' : 'Pendente'}
                      </span>
                      <span className="report-table-value tabular">
                        {formatMoney(o.total)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
