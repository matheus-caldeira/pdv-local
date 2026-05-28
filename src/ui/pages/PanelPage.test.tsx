import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PanelPage } from './PanelPage';
import type { Order } from '../../domain/order/order.entity';

const observeActiveOrders = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    observeActiveOrders: () => observeActiveOrders(),
  },
}));

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    sessionId: 1,
    items: [],
    total: 0,
    paymentMethod: null,
    customerName: '',
    ticket: '001',
    customerPhone: '',
    stage: 'aceito',
    status: 'open',
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

function fakeObservable(orders: Order[]) {
  return {
    subscribe(next: (value: Order[]) => void) {
      next(orders);
      return { unsubscribe: vi.fn() };
    },
  };
}

function renderPage() {
  return render(<PanelPage />);
}

describe('PanelPage', () => {
  beforeEach(() => {
    observeActiveOrders.mockReset();
  });
  afterEach(cleanup);

  it('shows empty messages when there are no orders', () => {
    observeActiveOrders.mockReturnValue(fakeObservable([]));
    renderPage();
    expect(screen.getByText('Nenhum pedido em preparo')).toBeInTheDocument();
    expect(screen.getByText('Nenhum pedido a caminho')).toBeInTheDocument();
  });

  it('renders preparing and on-the-way orders with names', () => {
    observeActiveOrders.mockReturnValue(
      fakeObservable([
        makeOrder({
          id: 1,
          ticket: '001',
          stage: 'aceito',
          customerName: 'Ana',
        }),
        makeOrder({ id: 2, ticket: '002', stage: 'a_caminho' }),
      ]),
    );
    renderPage();
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('#002')).toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum pedido em preparo'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Nenhum pedido a caminho'),
    ).not.toBeInTheDocument();
  });
});
