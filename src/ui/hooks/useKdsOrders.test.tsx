import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKdsOrders } from './useKdsOrders';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Order } from '../../domain/order/order.entity';

const observeSessionOrders = vi.fn();
const setOrderStage = vi.fn();
const unsubscribe = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    observeSessionOrders: (sessionUid: string) =>
      observeSessionOrders(sessionUid),
    setOrderStage: (uid: string, stage: string) => setOrderStage(uid, stage),
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
  makeOrder({ id: 1, uid: 'order-1', stage: 'aceito', createdAt: 2 }),
  makeOrder({ id: 2, uid: 'order-2', stage: 'aceito', createdAt: 1 }),
  makeOrder({ id: 3, uid: 'order-3', stage: 'em_preparo', createdAt: 3 }),
  makeOrder({
    id: 4,
    uid: 'order-4',
    stage: 'aceito',
    status: 'cancelled',
    createdAt: 0,
  }),
];

function fakeObservable(orders: Order[]) {
  return {
    subscribe(next: (value: Order[]) => void) {
      next(orders);
      return { unsubscribe };
    },
  };
}

function Probe({ sessionUid }: { sessionUid: string | undefined }) {
  const { orders, byStage, moveStage } = useKdsOrders(sessionUid);
  return (
    <div>
      <span>orders:{orders.length}</span>
      <span>
        aceito:
        {byStage('aceito')
          .map((o) => o.uid)
          .join(',')}
      </span>
      <button onClick={() => moveStage('order-1', 'em_preparo')}>move</button>
    </div>
  );
}

function renderProbe(sessionUid: string | undefined) {
  return render(
    <ToastProvider>
      <Probe sessionUid={sessionUid} />
    </ToastProvider>,
  );
}

describe('useKdsOrders', () => {
  beforeEach(() => {
    observeSessionOrders.mockReset();
    setOrderStage.mockReset();
    unsubscribe.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
  });
  afterEach(cleanup);

  it('returns empty list when there is no session', () => {
    renderProbe(undefined);
    expect(screen.getByText('orders:0')).toBeInTheDocument();
    expect(observeSessionOrders).not.toHaveBeenCalled();
  });

  it('subscribes and filters cancelled orders, sorted asc', () => {
    renderProbe('session-7');
    expect(observeSessionOrders).toHaveBeenCalledWith('session-7');
    expect(screen.getByText('orders:3')).toBeInTheDocument();
    expect(screen.getByText('aceito:order-2,order-1')).toBeInTheDocument();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderProbe('session-7');
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('moves a stage silently on success', async () => {
    setOrderStage.mockResolvedValue(right(undefined));
    renderProbe('session-7');
    await userEvent.click(screen.getByText('move'));
    expect(setOrderStage).toHaveBeenCalledWith('order-1', 'em_preparo');
    expect(screen.queryByRole('status')).toHaveTextContent('');
  });

  it('toasts when moving a stage fails', async () => {
    setOrderStage.mockResolvedValue(left(new FakeError('falha estagio')));
    renderProbe('session-7');
    await userEvent.click(screen.getByText('move'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha estagio'),
    );
  });
});
