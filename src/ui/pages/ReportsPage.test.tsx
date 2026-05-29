import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportsPage } from './ReportsPage';
import { ToastProvider } from '../molecules/Toast';
import { right } from '../../domain/shared/either';
import type { SessionReport } from '../../application/report/report.usecases';
import type { Session } from '../../domain/cash/cash.entity';
import type { Order, OrderStatus } from '../../domain/order/order.entity';

const listReportSessions = vi.fn();
const loadSessionReport = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listReportSessions: () => listReportSessions(),
    loadSessionReport: (id: number) => loadSessionReport(id),
  },
}));

const SESSIONS: Session[] = [
  {
    id: 1,
    openedAt: 1700000000000,
    closedAt: 1700003600000,
    cashInitial: 0,
    cashFinal: 0,
    notes: '',
  },
  {
    id: 2,
    openedAt: 1700100000000,
    closedAt: null,
    cashInitial: 0,
    cashFinal: null,
    notes: '',
  },
];

function makeOrder(ticket: string, status: OrderStatus, name: string): Order {
  return {
    id: Number(ticket),
    sessionId: 2,
    items: [],
    total: 30,
    paymentMethod: null,
    customerName: name,
    ticket,
    customerPhone: '',
    stage: 'aceito',
    status,
    createdAt: 1700100000000,
    updatedAt: 1700100000000,
  };
}

const FULL_REPORT: SessionReport = {
  summary: {
    totalSales: 200,
    totalCost: 80,
    profit: 120,
    margin: 60,
    paidCount: 4,
  },
  byMethod: { pix: 100, mistura: 100 },
  products: [{ name: 'Coxinha', qty: 5, total: 150, cost: 50 }],
  pending: [makeOrder('10', 'open', 'Ana'), makeOrder('11', 'pending', 'Bia')],
};

function renderPage() {
  return render(
    <ToastProvider>
      <ReportsPage />
    </ToastProvider>,
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    listReportSessions.mockReset();
    loadSessionReport.mockReset();
    listReportSessions.mockResolvedValue(right(SESSIONS));
    loadSessionReport.mockResolvedValue(right(FULL_REPORT));
  });
  afterEach(cleanup);

  it('shows the empty state when there are no sessions', async () => {
    listReportSessions.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma sessao encontrada')).toBeInTheDocument(),
    );
  });

  it('renders the active session pill with the active suffix selected by default', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/\(ativa\)/)).toBeInTheDocument(),
    );
    const activePill = screen.getByText(/\(ativa\)/).closest('button');
    expect(activePill).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the summary cards including formatted margin', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('R$ 200,00')).toBeInTheDocument(),
    );
    expect(screen.getByText('Total Vendas')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
  });

  it('renders payment methods with percentages and labels', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('PIX')).toBeInTheDocument());
    expect(screen.getByText('mistura')).toBeInTheDocument();
    expect(screen.getAllByText('50%')).toHaveLength(2);
  });

  it('renders the product ranking', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Coxinha')).toBeInTheDocument(),
    );
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });

  it('renders pending orders with open and pending badges', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#10')).toBeInTheDocument());
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('switches the report when a different session is selected', async () => {
    renderPage();
    await waitFor(() => expect(loadSessionReport).toHaveBeenCalledWith(2));
    loadSessionReport.mockResolvedValue(
      right({ ...FULL_REPORT, summary: { ...FULL_REPORT.summary, margin: 0 } }),
    );
    const closedPill = screen
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-pressed') === 'false')!;
    await userEvent.click(closedPill);
    await waitFor(() => expect(loadSessionReport).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText('0.0%')).toBeInTheDocument());
  });

  it('renders zero percentages when there are no sales', async () => {
    loadSessionReport.mockResolvedValue(
      right({
        summary: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          paidCount: 0,
        },
        byMethod: { pix: 0 },
        products: [],
        pending: [],
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('PIX')).toBeInTheDocument());
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows empty hints and hides pending when the report is empty', async () => {
    loadSessionReport.mockResolvedValue(
      right({
        summary: {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          paidCount: 0,
        },
        byMethod: {},
        products: [],
        pending: [],
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Nenhuma venda ainda').length).toBe(2),
    );
    expect(screen.queryByText('Pedidos Pendentes')).not.toBeInTheDocument();
  });
});
