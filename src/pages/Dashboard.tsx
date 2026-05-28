import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { db, type Order } from '../db/database';
import { useSession } from '../hooks/useSession';
import { formatMoney, formatTime } from '../utils/format';
import './Dashboard.css';

interface Stats {
  totalSales: number;
  orderCount: number;
  openOrders: number;
  topProducts: { name: string; qty: number; total: number }[];
  recentOrders: Order[];
}

export function Dashboard() {
  const { activeSession } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    orderCount: 0,
    openOrders: 0,
    topProducts: [],
    recentOrders: [],
  });

  useEffect(() => {
    if (!activeSession?.id) return;
    loadStats(activeSession.id);
  }, [activeSession]);

  async function loadStats(sessionId: number) {
    const orders = await db.orders
      .where('sessionId')
      .equals(sessionId)
      .toArray();
    const paidOrders = orders.filter((o) => o.status === 'paid');
    const openOrders = orders.filter(
      (o) => o.status === 'open' || o.status === 'pending',
    );

    const productMap = new Map<string, { qty: number; total: number }>();
    paidOrders.forEach((o) => {
      o.items.forEach((item) => {
        const existing = productMap.get(item.name) || { qty: 0, total: 0 };
        existing.qty += item.qty;
        existing.total += item.salePrice * item.qty;
        productMap.set(item.name, existing);
      });
    });

    const topProducts = [...productMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setStats({
      totalSales: paidOrders.reduce((s, o) => s + o.total, 0),
      orderCount: paidOrders.length,
      openOrders: openOrders.length,
      topProducts,
      recentOrders: orders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5),
    });
  }

  if (!activeSession) {
    return (
      <div className="dashboard-empty">
        <Wallet size={48} />
        <h2>Nenhuma sessao aberta</h2>
        <p>Abra uma sessao de caixa para comecar a vender.</p>
        <button className="btn btn-accent" onClick={() => navigate('/cash')}>
          Abrir Caixa
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Painel</h1>
          <span className="dashboard-session">
            <span className="session-dot-sm" />
            Sessao aberta desde {formatTime(activeSession.openedAt)}
          </span>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/pdv')}>
          <ShoppingCart size={18} />
          Nova Venda
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-highlight">
          <div className="stat-icon">
            <TrendingUp size={20} />
          </div>
          <div className="stat-value tabular">
            {formatMoney(stats.totalSales)}
          </div>
          <div className="stat-label">Vendas da sessao</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ShoppingCart size={20} />
          </div>
          <div className="stat-value tabular">{stats.orderCount}</div>
          <div className="stat-label">Pedidos pagos</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={20} />
          </div>
          <div className="stat-value tabular">{stats.openOrders}</div>
          <div className="stat-label">Em aberto</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3 className="section-label">Top Produtos</h3>
          {stats.topProducts.length === 0 ? (
            <div className="empty-hint">Nenhuma venda ainda</div>
          ) : (
            <div className="top-products">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="top-product-row">
                  <span className="top-rank">{i + 1}</span>
                  <span className="top-name">{p.name}</span>
                  <span className="top-qty">{p.qty}x</span>
                  <span className="top-total tabular">
                    {formatMoney(p.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h3 className="section-label">Ultimos Pedidos</h3>
          {stats.recentOrders.length === 0 ? (
            <div className="empty-hint">Nenhum pedido</div>
          ) : (
            <div className="recent-orders">
              {stats.recentOrders.map((o) => (
                <div key={o.id} className="recent-order-row">
                  <div>
                    <span className="recent-ticket">#{o.ticket}</span>
                    {o.customerName && (
                      <span className="recent-customer">{o.customerName}</span>
                    )}
                  </div>
                  <div className="recent-right">
                    <span className={`status-badge status-${o.status}`}>
                      {statusLabel(o.status)}
                    </span>
                    <span className="recent-total tabular">
                      {formatMoney(o.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Wallet({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Aberto';
    case 'paid':
      return 'Pago';
    case 'pending':
      return 'Pendente';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}
