import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useOrders } from './useOrders';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Order, OrderStatus } from '../../domain/order/order.entity';
import type { OrderQuery } from '../../domain/order/order.repository';
import type { BusinessConfig } from '../../domain/config/config.entity';

const listOrderPage = vi.fn();
const readConfig = vi.fn();
const markOrderPaid = vi.fn();
const cancelOrder = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listOrderPage: (query: OrderQuery) => listOrderPage(query),
    readConfig: () => readConfig(),
    markOrderPaid: (uid: string, method: string) => markOrderPaid(uid, method),
    cancelOrder: (uid: string) => cancelOrder(uid),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeOrder(uid: string): Order {
  return {
    id: Number(uid.replace(/\D/g, '')) || 1,
    uid,
    businessTypeId: 'tab',
    sessionUid: 'session-1',
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
}

const CONFIG: BusinessConfig = {
  layoutMode: 'auto',
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 0,
  ticketLimit: 0,
  ticketAutoReset: false,
  statusControlEnabled: true,
  businessTypeId: 'tab',
  enabledModules: [],
  extra: {},
  printerDriver: 'browser',
  printerPaperWidth: 80,
  printerCodepage: 'cp860',
  printerAutoPrintOnClose: false,
};

function page(orders: Order[], total: number, hasMore: boolean) {
  return right({ orders, total, hasMore });
}

function Probe() {
  const {
    orders,
    statuses,
    setStatuses,
    term,
    setTerm,
    total,
    hasMore,
    loadMore,
    statusControlEnabled,
    markPaid,
    cancel,
  } = useOrders();
  return (
    <div>
      <span>orders:{orders.length}</span>
      <span>total:{total}</span>
      <span>more:{String(hasMore)}</span>
      <span>statuses:{statuses.join(',')}</span>
      <span>term:{term}</span>
      <span>control:{String(statusControlEnabled)}</span>
      <button onClick={() => setStatuses(['paid'] as OrderStatus[])}>
        only-paid
      </button>
      <button onClick={() => setTerm('bruno')}>search</button>
      <button onClick={loadMore}>more</button>
      <button onClick={() => markPaid('order-1', 'pix')}>pay</button>
      <button onClick={() => cancel('order-1')}>cancel</button>
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
    listOrderPage.mockReset();
    readConfig.mockReset();
    markOrderPaid.mockReset();
    cancelOrder.mockReset();
    listOrderPage.mockResolvedValue(page([makeOrder('order-1')], 1, false));
    readConfig.mockResolvedValue(right(CONFIG));
  });
  afterEach(cleanup);

  it('carrega a primeira página com abertos e pendentes por padrão', async () => {
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('orders:1')).toBeInTheDocument(),
    );
    expect(listOrderPage).toHaveBeenCalledWith({
      statuses: ['open', 'pending'],
      term: '',
      offset: 0,
      limit: 30,
    });
    expect(screen.getByText('statuses:open,pending')).toBeInTheDocument();
  });

  it('expõe o total e o hasMore da página', async () => {
    listOrderPage.mockResolvedValue(page([makeOrder('order-1')], 214, true));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('total:214')).toBeInTheDocument(),
    );
    expect(screen.getByText('more:true')).toBeInTheDocument();
  });

  it('acumula a próxima página ao carregar mais', async () => {
    listOrderPage.mockResolvedValueOnce(page([makeOrder('order-1')], 2, true));
    listOrderPage.mockResolvedValueOnce(page([makeOrder('order-2')], 2, false));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('orders:1')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText('more'));

    await waitFor(() =>
      expect(screen.getByText('orders:2')).toBeInTheDocument(),
    );
    expect(listOrderPage).toHaveBeenLastCalledWith({
      statuses: ['open', 'pending'],
      term: '',
      offset: 1,
      limit: 30,
    });
    expect(screen.getByText('more:false')).toBeInTheDocument();
  });

  it('reseta o offset e substitui a lista ao trocar de status', async () => {
    listOrderPage.mockResolvedValueOnce(page([makeOrder('order-1')], 2, true));
    listOrderPage.mockResolvedValueOnce(page([makeOrder('order-2')], 2, false));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('orders:1')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('more'));
    await waitFor(() =>
      expect(screen.getByText('orders:2')).toBeInTheDocument(),
    );

    listOrderPage.mockResolvedValue(page([makeOrder('order-3')], 1, false));
    await userEvent.click(screen.getByText('only-paid'));

    await waitFor(() =>
      expect(screen.getByText('orders:1')).toBeInTheDocument(),
    );
    expect(listOrderPage).toHaveBeenLastCalledWith({
      statuses: ['paid'],
      term: '',
      offset: 0,
      limit: 30,
    });
  });

  it('consulta com o termo digitado depois do debounce', async () => {
    renderProbe();
    await waitFor(() => expect(listOrderPage).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByText('search'));

    await waitFor(() =>
      expect(listOrderPage).toHaveBeenLastCalledWith({
        statuses: ['open', 'pending'],
        term: 'bruno',
        offset: 0,
        limit: 30,
      }),
    );
  });

  it('avisa quando a busca falha', async () => {
    listOrderPage.mockResolvedValue(left(new FakeError('falha pedidos')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pedidos'),
    );
    expect(screen.getByText('orders:0')).toBeInTheDocument();
  });

  it('avisa quando a configuração falha', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
    expect(screen.getByText('control:false')).toBeInTheDocument();
  });

  it('marca como pago e recarrega a lista do começo', async () => {
    markOrderPaid.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listOrderPage).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByText('pay'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido marcado como pago',
      ),
    );
    expect(markOrderPaid).toHaveBeenCalledWith('order-1', 'pix');
    expect(listOrderPage).toHaveBeenCalledTimes(2);
  });

  it('avisa quando marcar como pago falha', async () => {
    markOrderPaid.mockResolvedValue(left(new FakeError('falha pago')));
    renderProbe();
    await waitFor(() => expect(listOrderPage).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByText('pay'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha pago'),
    );
    expect(listOrderPage).toHaveBeenCalledTimes(1);
  });

  it('cancela e recarrega a lista do começo', async () => {
    cancelOrder.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listOrderPage).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByText('cancel'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Pedido cancelado'),
    );
    expect(cancelOrder).toHaveBeenCalledWith('order-1');
    expect(listOrderPage).toHaveBeenCalledTimes(2);
  });

  it('avisa quando cancelar falha', async () => {
    cancelOrder.mockResolvedValue(left(new FakeError('falha cancelar')));
    renderProbe();
    await waitFor(() => expect(listOrderPage).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByText('cancel'));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha cancelar'),
    );
    expect(listOrderPage).toHaveBeenCalledTimes(1);
  });
});
