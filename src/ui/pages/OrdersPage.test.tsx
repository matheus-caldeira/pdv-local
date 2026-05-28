import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersPage } from './OrdersPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Order } from '../../domain/order/order.entity';
import type { BusinessConfig } from '../../domain/config/config.entity';

const listOrders = vi.fn();
const readConfig = vi.fn();
const markOrderPaid = vi.fn();
const cancelOrder = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listOrders: () => listOrders(),
    readConfig: () => readConfig(),
    markOrderPaid: (id: number, method: string) => markOrderPaid(id, method),
    cancelOrder: (id: number) => cancelOrder(id),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    sessionId: 1,
    items: [{ productId: 1, name: 'Item', salePrice: 5, costPrice: 1, qty: 1 }],
    total: 5,
    paymentMethod: null,
    customerName: '',
    ticket: '001',
    customerPhone: '',
    stage: 'aceito',
    status: 'open',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...partial,
  };
}

const ORDERS: Order[] = [
  makeOrder({
    id: 1,
    ticket: '001',
    customerName: 'Ana',
    status: 'open',
    paymentMethod: 'pix',
    items: [
      { productId: 1, name: 'X', salePrice: 5, costPrice: 1, qty: 1 },
      { productId: 2, name: 'Y', salePrice: 5, costPrice: 1, qty: 2 },
    ],
  }),
  makeOrder({
    id: 2,
    ticket: '002',
    customerName: 'Bruno',
    status: 'paid',
    paymentMethod: 'dinheiro',
  }),
  makeOrder({
    id: 3,
    ticket: '003',
    customerName: '',
    status: 'cancelled',
    paymentMethod: null,
  }),
  makeOrder({
    id: 4,
    ticket: '004',
    customerName: 'Davi',
    status: 'pending',
    paymentMethod: 'vale',
  }),
];

const CONFIG: BusinessConfig = {
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 0,
  ticketLimit: 0,
  ticketAutoReset: false,
  statusControlEnabled: false,
};

function renderPage() {
  return render(
    <ToastProvider>
      <OrdersPage />
    </ToastProvider>,
  );
}

describe('OrdersPage', () => {
  beforeEach(() => {
    listOrders.mockReset();
    readConfig.mockReset();
    markOrderPaid.mockReset();
    cancelOrder.mockReset();
    listOrders.mockResolvedValue(right(ORDERS));
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty hint when there are no orders', async () => {
    listOrders.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum pedido encontrado')).toBeInTheDocument(),
    );
    expect(screen.getByText('0 pedidos')).toBeInTheDocument();
  });

  it('lists orders with status badges, payment labels and item counts', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    expect(screen.getByText('4 pedidos')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('vale')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === '2 itens'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText((_, element) => element?.textContent === '1 item')
        .length,
    ).toBeGreaterThan(0);
  });

  it('shows a dash when there is no payment method', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#003')).toBeInTheDocument());
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows stage badges only when status control is enabled', async () => {
    readConfig.mockResolvedValue(
      right({ ...CONFIG, statusControlEnabled: true }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Aceito').length).toBeGreaterThan(0),
    );
  });

  it('filters by status', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Pagos' }));
    expect(screen.getByText('#002')).toBeInTheDocument();
    expect(screen.queryByText('#001')).not.toBeInTheDocument();
  });

  it('filters by ticket and by customer name', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Buscar pedidos'), '002');
    expect(screen.getByText('#002')).toBeInTheDocument();
    expect(screen.queryByText('#001')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Buscar pedidos'));
    await userEvent.type(screen.getByLabelText('Buscar pedidos'), 'davi');
    expect(screen.getByText('#004')).toBeInTheDocument();
    expect(screen.queryByText('#001')).not.toBeInTheDocument();
  });

  it('opens the detail modal and prints', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Pedido #001')).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Imprimir/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Configure a impressora',
      ),
    );
  });

  it('closes the detail modal via the backdrop', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('marks an order as paid and closes the modal', async () => {
    markOrderPaid.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#004')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#004'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como Pago' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Debito' }));
    expect(markOrderPaid).toHaveBeenCalledWith(4, 'debito');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the modal open when marking as paid fails', async () => {
    markOrderPaid.mockResolvedValue(left(new FakeError('falha pago')));
    renderPage();
    await waitFor(() => expect(screen.getByText('#004')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#004'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como Pago' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Credito' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pago'),
    );
    expect(
      screen.getByRole('dialog', { name: 'Pedido #004' }),
    ).toBeInTheDocument();
  });

  it('cancels an order after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    cancelOrder.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar Pedido' }),
    );
    expect(cancelOrder).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('does not cancel when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar Pedido' }),
    );
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('keeps the modal open when cancelling fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    cancelOrder.mockResolvedValue(left(new FakeError('falha cancelar')));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar Pedido' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha cancelar'),
    );
    expect(
      screen.getByRole('dialog', { name: 'Pedido #001' }),
    ).toBeInTheDocument();
  });
});
