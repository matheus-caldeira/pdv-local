import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { usePanelOrders } from './usePanelOrders';
import type { Order } from '../../domain/order/order.entity';

const observeActiveOrders = vi.fn();
const unsubscribe = vi.fn();

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

const ORDERS: Order[] = [
  makeOrder({ id: 1, stage: 'aceito', createdAt: 2 }),
  makeOrder({ id: 2, stage: 'em_preparo', createdAt: 1 }),
  makeOrder({ id: 3, stage: 'a_caminho', createdAt: 5 }),
  makeOrder({ id: 4, stage: 'a_caminho', createdAt: 4 }),
];

function fakeObservable(orders: Order[]) {
  return {
    subscribe(next: (value: Order[]) => void) {
      next(orders);
      return { unsubscribe };
    },
  };
}

function Probe() {
  const { preparing, onTheWay } = usePanelOrders();
  return (
    <div>
      <span>preparing:{preparing.map((o) => o.id).join(',')}</span>
      <span>onTheWay:{onTheWay.map((o) => o.id).join(',')}</span>
    </div>
  );
}

describe('usePanelOrders', () => {
  beforeEach(() => {
    observeActiveOrders.mockReset();
    unsubscribe.mockReset();
    observeActiveOrders.mockReturnValue(fakeObservable(ORDERS));
  });
  afterEach(cleanup);

  it('derives preparing and onTheWay lists sorted asc', () => {
    render(<Probe />);
    expect(observeActiveOrders).toHaveBeenCalled();
    expect(screen.getByText('preparing:2,1')).toBeInTheDocument();
    expect(screen.getByText('onTheWay:4,3')).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
