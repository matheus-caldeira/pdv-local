import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useOrders } from './useOrders';
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

const ORDER: Order = {
  id: 1,
  sessionId: 1,
  items: [],
  total: 10,
  paymentMethod: null,
  customerName: 'Ana',
  ticket: '001',
  customerPhone: '',
  stage: 'aceito',
  status: 'open',
  createdAt: 1,
  updatedAt: 1,
};

const CONFIG: BusinessConfig = {
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 0,
  ticketLimit: 0,
  ticketAutoReset: false,
  statusControlEnabled: true,
};

function Probe() {
  const { orders, statusControlEnabled, markPaid, cancel } = useOrders();
  return (
    <div>
      <span>orders:{orders.length}</span>
      <span>control:{String(statusControlEnabled)}</span>
      <button onClick={() => markPaid(1, 'pix')}>pay</button>
      <button onClick={() => cancel(1)}>cancel</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useOrders', () => {
  beforeEach(() => {
    listOrders.mockReset();
    readConfig.mockReset();
    markOrderPaid.mockReset();
    cancelOrder.mockReset();
    listOrders.mockResolvedValue(right([ORDER]));
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(cleanup);

  it('loads orders and config on mount', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('control:true')).toBeInTheDocument(),
    );
    expect(screen.getByText('orders:1')).toBeInTheDocument();
  });

  it('toasts when loading orders fails', async () => {
    listOrders.mockResolvedValue(left(new FakeError('falha pedidos')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pedidos'),
    );
    expect(screen.getByText('orders:0')).toBeInTheDocument();
  });

  it('toasts when loading config fails', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
    expect(screen.getByText('control:false')).toBeInTheDocument();
  });

  it('marks an order as paid and reloads', async () => {
    markOrderPaid.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listOrders).toHaveBeenCalled());
    await userEvent.click(screen.getByText('pay'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido marcado como pago',
      ),
    );
    expect(markOrderPaid).toHaveBeenCalledWith(1, 'pix');
    expect(listOrders).toHaveBeenCalledTimes(2);
  });

  it('toasts when marking as paid fails', async () => {
    markOrderPaid.mockResolvedValue(left(new FakeError('falha pago')));
    renderProbe();
    await waitFor(() => expect(listOrders).toHaveBeenCalled());
    await userEvent.click(screen.getByText('pay'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pago'),
    );
    expect(listOrders).toHaveBeenCalledTimes(1);
  });

  it('cancels an order and reloads', async () => {
    cancelOrder.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listOrders).toHaveBeenCalled());
    await userEvent.click(screen.getByText('cancel'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Pedido cancelado'),
    );
    expect(cancelOrder).toHaveBeenCalledWith(1);
    expect(listOrders).toHaveBeenCalledTimes(2);
  });

  it('toasts when cancelling fails', async () => {
    cancelOrder.mockResolvedValue(left(new FakeError('falha cancelar')));
    renderProbe();
    await waitFor(() => expect(listOrders).toHaveBeenCalled());
    await userEvent.click(screen.getByText('cancel'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha cancelar'),
    );
    expect(listOrders).toHaveBeenCalledTimes(1);
  });
});
