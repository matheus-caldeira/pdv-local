import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderDetail } from './OrderDetail';
import type { Order } from '../../domain/order/order.entity';

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    sessionId: 1,
    items: [],
    total: 30,
    paymentMethod: null,
    customerName: 'Bia',
    ticket: '005',
    customerPhone: '',
    stage: 'aceito',
    status: 'open',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...partial,
  };
}

const RICH_ORDER = makeOrder({
  items: [
    {
      productId: 1,
      name: 'X-Burger',
      salePrice: 20,
      costPrice: 5,
      qty: 2,
      observation: 'Sem cebola',
      customizationTotal: 5,
      customizations: [
        {
          groupName: 'Adicionais',
          items: [
            { name: 'Bacon', qty: 2, price: 5 },
            { name: 'Queijo', qty: 1, price: 0 },
          ],
        },
      ],
    },
    {
      productId: 2,
      name: 'Refri',
      salePrice: 8,
      costPrice: 2,
      qty: 1,
    },
  ],
});

function renderDetail(order: Order) {
  const onPrint = vi.fn();
  const onMarkPaid = vi.fn();
  const onCancel = vi.fn();
  render(
    <OrderDetail
      order={order}
      onPrint={onPrint}
      onMarkPaid={onMarkPaid}
      onCancel={onCancel}
    />,
  );
  return { onPrint, onMarkPaid, onCancel };
}

describe('OrderDetail', () => {
  afterEach(cleanup);

  it('renders items, customizations, observation and breakdown', () => {
    renderDetail(RICH_ORDER);
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.getByText('Refri')).toBeInTheDocument();
    expect(screen.getByText('Adicionais:')).toBeInTheDocument();
    expect(screen.getByText(/Bacon/)).toBeInTheDocument();
    expect(screen.getByText('Sem cebola')).toBeInTheDocument();
    expect(screen.getByText(/Produto:/)).toBeInTheDocument();
  });

  it('shows the open status badge and customer name', () => {
    renderDetail(RICH_ORDER);
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.getByText('Sem pagamento')).toBeInTheDocument();
  });

  it('shows known and unknown payment labels', () => {
    const { unmount } = render(
      <OrderDetail
        order={makeOrder({ paymentMethod: 'pix' })}
        onPrint={vi.fn()}
        onMarkPaid={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('PIX')).toBeInTheDocument();
    unmount();
    renderDetail(makeOrder({ paymentMethod: 'vale' }));
    expect(screen.getByText('vale')).toBeInTheDocument();
  });

  it('renders the paid status without settle buttons', () => {
    renderDetail(makeOrder({ status: 'paid', customerName: '' }));
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Marcar como Pago' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Bia')).not.toBeInTheDocument();
  });

  it('renders the pending status with settle buttons', () => {
    renderDetail(makeOrder({ status: 'pending' }));
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Marcar como Pago' }),
    ).toBeInTheDocument();
  });

  it('renders the cancelled status', () => {
    renderDetail(makeOrder({ status: 'cancelled' }));
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('calls onPrint', async () => {
    const { onPrint } = renderDetail(RICH_ORDER);
    await userEvent.click(screen.getByRole('button', { name: /Imprimir/ }));
    expect(onPrint).toHaveBeenCalled();
  });

  it('marks paid through the payment-method modal', async () => {
    const { onMarkPaid } = renderDetail(RICH_ORDER);
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como Pago' }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'PIX' }));
    expect(onMarkPaid).toHaveBeenCalledWith('pix');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the payment modal via backdrop without paying', async () => {
    const { onMarkPaid } = renderDetail(RICH_ORDER);
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como Pago' }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onMarkPaid).not.toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const { onCancel } = renderDetail(RICH_ORDER);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cancelar Pedido' }),
    );
    expect(onCancel).toHaveBeenCalled();
  });
});
