import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrdersPage } from './OrdersPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import { getBusinessType } from '../../domain/business-type/registry';
import type { Order } from '../../domain/order/order.entity';
import type { BusinessConfig } from '../../domain/config/config.entity';

const navigate = vi.fn();
const listOrders = vi.fn();
const readConfig = vi.fn();
const markOrderPaid = vi.fn();
const cancelOrder = vi.fn();
const getActiveSession = vi.fn();
const resolveActiveType = vi.fn();
const openTab = vi.fn();
const addItemsToTab = vi.fn();
const closeTab = vi.fn();
const reopenTab = vi.fn();
const printOrder = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../hooks/usePrint', () => ({
  usePrint: () => ({
    printOrder: (order: unknown) => printOrder(order),
    printStock: vi.fn(),
    printPendingTabs: vi.fn(),
    printDayReport: vi.fn(),
    printing: false,
  }),
}));

vi.mock('../../app/container', () => ({
  container: {
    listOrders: () => listOrders(),
    readConfig: () => readConfig(),
    markOrderPaid: (uid: string, method: string) => markOrderPaid(uid, method),
    cancelOrder: (uid: string) => cancelOrder(uid),
    getActiveSession: () => getActiveSession(),
    resolveActiveType: () => resolveActiveType(),
    openTab: (definition: unknown, input: unknown) =>
      openTab(definition, input),
    addItemsToTab: (input: unknown) => addItemsToTab(input),
    closeTab: (input: unknown) => closeTab(input),
    reopenTab: (input: unknown) => reopenTab(input),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    uid: 'order-1',
    businessTypeId: 'tab',
    sessionUid: 'session-1',
    items: [
      {
        productUid: 'product-1',
        name: 'Item',
        salePrice: 5,
        costPrice: 1,
        qty: 1,
      },
    ],
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
    uid: 'order-1',
    ticket: '001',
    customerName: 'Ana',
    status: 'open',
    paymentMethod: 'pix',
    items: [
      {
        productUid: 'product-1',
        name: 'X',
        salePrice: 5,
        costPrice: 1,
        qty: 1,
      },
      {
        productUid: 'product-2',
        name: 'Y',
        salePrice: 5,
        costPrice: 1,
        qty: 2,
      },
    ],
  }),
  makeOrder({
    id: 2,
    uid: 'order-2',
    ticket: '002',
    customerName: 'Bruno',
    status: 'paid',
    paymentMethod: 'dinheiro',
  }),
  makeOrder({
    id: 3,
    uid: 'order-3',
    ticket: '003',
    customerName: '',
    status: 'cancelled',
    paymentMethod: null,
  }),
  makeOrder({
    id: 4,
    uid: 'order-4',
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
  businessTypeId: 'tab',
  enabledModules: [],
  extra: {},
  printerDriver: 'browser',
  printerPaperWidth: 80,
  printerAutoPrintOnClose: false,
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('OrdersPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    listOrders.mockReset();
    readConfig.mockReset();
    markOrderPaid.mockReset();
    cancelOrder.mockReset();
    getActiveSession.mockReset();
    resolveActiveType.mockReset();
    openTab.mockReset();
    addItemsToTab.mockReset();
    closeTab.mockReset();
    reopenTab.mockReset();
    printOrder.mockReset();
    listOrders.mockResolvedValue(right(ORDERS));
    readConfig.mockResolvedValue(right(CONFIG));
    getActiveSession.mockResolvedValue(
      right({ id: 1, uid: 'session-1', closedAt: null }),
    );
    resolveActiveType.mockResolvedValue(right(getBusinessType('tab')));
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
      expect(printOrder).toHaveBeenCalledWith(
        expect.objectContaining({ ticket: '001' }),
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
    await userEvent.click(screen.getByRole('button', { name: 'Débito' }));
    expect(markOrderPaid).toHaveBeenCalledWith('order-4', 'debito');
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
    await userEvent.click(screen.getByRole('button', { name: 'Crédito' }));
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
    expect(cancelOrder).toHaveBeenCalledWith('order-1');
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

  it('closes a tab through the order detail', async () => {
    closeTab.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );
    expect(closeTab).toHaveBeenCalledWith({ orderUid: 'order-1' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the modal open when closing a tab fails', async () => {
    closeTab.mockResolvedValue(left(new FakeError('falha fechar')));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha fechar'),
    );
    expect(
      screen.getByRole('dialog', { name: 'Pedido #001' }),
    ).toBeInTheDocument();
  });

  it('reopens a tab through the order detail', async () => {
    reopenTab.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#004')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#004'));
    await userEvent.click(screen.getByRole('button', { name: /reabrir/i }));
    const dialog = screen.getByRole('dialog', { name: 'Reabrir comanda' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^reabrir$/i }),
    );
    expect(reopenTab).toHaveBeenCalledWith({ orderUid: 'order-4' });
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Pedido #004' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('keeps the modal open when reopening a tab fails', async () => {
    reopenTab.mockResolvedValue(left(new FakeError('falha reabrir')));
    renderPage();
    await waitFor(() => expect(screen.getByText('#004')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#004'));
    await userEvent.click(screen.getByRole('button', { name: /reabrir/i }));
    const dialog = screen.getByRole('dialog', { name: 'Reabrir comanda' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^reabrir$/i }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha reabrir'),
    );
    expect(
      screen.getByRole('dialog', { name: 'Pedido #004' }),
    ).toBeInTheDocument();
  });

  it('navigates to the PDV to add items to an open tab', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /adicionar itens/i }),
    );
    expect(navigate).toHaveBeenCalledWith('/pdv?tab=order-1');
  });

  it('imprime automaticamente ao fechar quando a config está ligada', async () => {
    readConfig.mockResolvedValue(
      right({ ...CONFIG, printerAutoPrintOnClose: true }),
    );
    closeTab.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );

    await waitFor(() => expect(printOrder).toHaveBeenCalled());
  });

  it('não imprime automaticamente ao fechar quando a config está desligada', async () => {
    readConfig.mockResolvedValue(
      right({ ...CONFIG, printerAutoPrintOnClose: false }),
    );
    closeTab.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(printOrder).not.toHaveBeenCalled();
  });

  it('não imprime automaticamente quando a leitura da config falha', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    closeTab.mockResolvedValue(right(undefined));
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(printOrder).not.toHaveBeenCalled();
  });

  it('mantém a comanda fechada quando a impressão falha', async () => {
    readConfig.mockResolvedValue(
      right({ ...CONFIG, printerAutoPrintOnClose: true }),
    );
    closeTab.mockResolvedValue(right(undefined));
    printOrder.mockResolvedValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('#001')).toBeInTheDocument());
    await userEvent.click(screen.getByText('#001'));
    await userEvent.click(
      screen.getByRole('button', { name: /fechar comanda/i }),
    );

    await waitFor(() => expect(closeTab).toHaveBeenCalled());
    expect(printOrder).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
