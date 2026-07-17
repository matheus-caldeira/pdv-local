import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from './DashboardPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { DashboardData } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';
import type { Order, OrderStatus } from '../../domain/order/order.entity';

const loadDashboard = vi.fn();
const navigate = vi.fn();

let sessionState: { activeSession: Session | null; loading: boolean } = {
  activeSession: null,
  loading: false,
};

let modules: string[] = ['pdv'];

vi.mock('../../app/container', () => ({
  container: {
    loadDashboard: (uid: string) => loadDashboard(uid),
  },
}));

vi.mock('../hooks/useSession', () => ({
  useSession: () => sessionState,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  Link: ({
    to,
    className,
    children,
  }: {
    to: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('../../app/modules-context', () => ({
  useModules: () => ({
    modules,
    needsFirstRun: false,
    status: 'ready',
    refresh: () => Promise.resolve(),
  }),
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const ACTIVE_SESSION: Session = {
  id: 1,
  uid: 'session-1',
  openedAt: 1700000000000,
  closedAt: null,
  cashInitial: 0,
  cashFinal: null,
  notes: '',
};

function makeOrder(
  ticket: string,
  status: OrderStatus,
  customerName: string,
): Order {
  return {
    id: Number(ticket),
    uid: `order-${ticket}`,
    businessTypeId: 'tab',
    sessionUid: 'session-1',
    items: [],
    total: 25,
    paymentMethod: null,
    customerName,
    ticket,
    customerPhone: '',
    stage: 'aceito',
    status,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };
}

const DATA: DashboardData = {
  summary: {
    totalSales: 250,
    totalCost: 100,
    profit: 150,
    margin: 60,
    paidCount: 5,
  },
  openCount: 2,
  topProducts: [{ name: 'Burger', qty: 3, total: 90, cost: 30 }],
  recent: [
    makeOrder('1', 'open', 'Ana'),
    makeOrder('2', 'paid', 'Bia'),
    makeOrder('3', 'pending', 'Caio'),
    makeOrder('4', 'cancelled', ''),
  ],
};

function renderPage() {
  return render(
    <ToastProvider>
      <DashboardPage />
    </ToastProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    loadDashboard.mockReset();
    navigate.mockReset();
    loadDashboard.mockResolvedValue(right(DATA));
    sessionState = { activeSession: null, loading: false };
    modules = ['pdv'];
  });
  afterEach(cleanup);

  it('shows a loading state while the session resolves', () => {
    sessionState = { activeSession: null, loading: true };
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows the empty state and navigates to cash', async () => {
    renderPage();
    expect(screen.getByText('Nenhuma sessão aberta')).toBeInTheDocument();
    expect(
      screen.getByText('Abra uma sessão de caixa para começar a vender.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Caixa' }));
    expect(navigate).toHaveBeenCalledWith('/cash');
  });

  it('renders the panel with summary, products and orders', async () => {
    sessionState = { activeSession: ACTIVE_SESSION, loading: false };
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('R$ 250,00')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Sessão aberta desde/)).toBeInTheDocument();
    expect(screen.getByText('Vendas da sessão')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(loadDashboard).toHaveBeenCalledWith('session-1');
  });

  it('navigates to pdv from nova venda', async () => {
    sessionState = { activeSession: ACTIVE_SESSION, loading: false };
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('R$ 250,00')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Nova Venda/ }));
    expect(navigate).toHaveBeenCalledWith('/pdv');
  });

  it('shows empty hints when there are no products or orders', async () => {
    sessionState = { activeSession: ACTIVE_SESSION, loading: false };
    loadDashboard.mockResolvedValue(
      right({ ...DATA, topProducts: [], recent: [] }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma venda ainda')).toBeInTheDocument(),
    );
    expect(screen.getByText('Nenhum pedido')).toBeInTheDocument();
  });

  it('renders defaults before the dashboard data arrives', async () => {
    sessionState = { activeSession: ACTIVE_SESSION, loading: false };
    loadDashboard.mockResolvedValue(left(new FakeError('falha')));
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha'),
    );
    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma venda ainda')).toBeInTheDocument();
  });

  describe('card do financeiro', () => {
    it('mostra o atalho quando o financeiro está ativo', async () => {
      modules = ['pdv', 'finance'];
      sessionState = { activeSession: ACTIVE_SESSION, loading: false };
      renderPage();
      expect(
        await screen.findByRole('link', { name: /Ir para o Financeiro/ }),
      ).toHaveAttribute('href', '/finance');
    });

    it('não mostra o atalho quando só o pdv está ativo', async () => {
      modules = ['pdv'];
      sessionState = { activeSession: ACTIVE_SESSION, loading: false };
      renderPage();
      expect(
        screen.queryByRole('link', { name: /Ir para o Financeiro/ }),
      ).toBeNull();
    });

    it('mostra o atalho mesmo sem sessão de caixa aberta', () => {
      modules = ['pdv', 'finance'];
      sessionState = { activeSession: null, loading: false };
      renderPage();
      expect(
        screen.getByRole('link', { name: /Ir para o Financeiro/ }),
      ).toHaveAttribute('href', '/finance');
    });

    it('não mostra o atalho durante o carregamento', () => {
      modules = ['pdv', 'finance'];
      sessionState = { activeSession: null, loading: true };
      renderPage();
      expect(
        screen.queryByRole('link', { name: /Ir para o Financeiro/ }),
      ).toBeNull();
    });
  });
});
