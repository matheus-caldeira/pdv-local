import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKdsOrders } from './useKdsOrders';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { Order, OrderStage } from '../../domain/order/order.entity';

const observeSessionOrders = vi.fn();
const listFinishedOrderPage = vi.fn();
const setOrderStage = vi.fn();
const unsubscribe = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    observeActiveSessionOrders: (sessionUid: string) =>
      observeSessionOrders(sessionUid),
    listFinishedOrderPage: (
      sessionUid: string,
      offset: number,
      limit: number,
    ) => listFinishedOrderPage(sessionUid, offset, limit),
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
      <span>
        finalizado:
        {byStage('finalizado')
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
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    unsubscribe.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: [], total: 0, hasMore: false }),
    );
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

  it('toma os finalizados da paginação, não do stream ao vivo', async () => {
    observeSessionOrders.mockReturnValue(
      fakeObservable([
        ...ORDERS,
        makeOrder({ id: 9, uid: 'stream-done', stage: 'finalizado' }),
      ]),
    );
    listFinishedOrderPage.mockResolvedValue(
      right({
        orders: [makeOrder({ uid: 'paged-done', stage: 'finalizado' })],
        total: 1,
        hasMore: false,
      }),
    );

    renderProbe('session-7');

    await waitFor(() =>
      expect(screen.getByText('finalizado:paged-done')).toBeInTheDocument(),
    );
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

function FinishedProbe({ sessionUid }: { sessionUid: string | undefined }) {
  const { finished, finishedTotal, finishedHasMore, loadMoreFinished } =
    useKdsOrders(sessionUid);
  return (
    <div>
      <span>finished:{finished.map((order) => order.uid).join(',')}</span>
      <span>finishedTotal:{finishedTotal}</span>
      <span>finishedMore:{String(finishedHasMore)}</span>
      <button onClick={loadMoreFinished}>more</button>
    </div>
  );
}

function renderFinishedProbe(sessionUid: string | undefined) {
  return render(
    <ToastProvider>
      <FinishedProbe sessionUid={sessionUid} />
    </ToastProvider>,
  );
}

describe('useKdsOrders finalizados', () => {
  beforeEach(() => {
    observeSessionOrders.mockReset();
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    unsubscribe.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: [], total: 0, hasMore: false }),
    );
  });
  afterEach(cleanup);

  it('não busca finalizados sem sessão', () => {
    renderFinishedProbe(undefined);
    expect(listFinishedOrderPage).not.toHaveBeenCalled();
  });

  it('carrega a primeira página de finalizados da sessão', async () => {
    listFinishedOrderPage.mockResolvedValue(
      right({
        orders: [makeOrder({ uid: 'done-1', stage: 'finalizado' })],
        total: 25,
        hasMore: true,
      }),
    );

    renderFinishedProbe('session-7');

    await waitFor(() =>
      expect(screen.getByText('finished:done-1')).toBeInTheDocument(),
    );
    expect(listFinishedOrderPage).toHaveBeenCalledWith('session-7', 0, 20);
    expect(screen.getByText('finishedTotal:25')).toBeInTheDocument();
    expect(screen.getByText('finishedMore:true')).toBeInTheDocument();
  });

  it('acumula a próxima página de finalizados', async () => {
    listFinishedOrderPage.mockResolvedValueOnce(
      right({
        orders: [makeOrder({ uid: 'done-1', stage: 'finalizado' })],
        total: 2,
        hasMore: true,
      }),
    );
    listFinishedOrderPage.mockResolvedValueOnce(
      right({
        orders: [makeOrder({ uid: 'done-2', stage: 'finalizado' })],
        total: 2,
        hasMore: false,
      }),
    );

    renderFinishedProbe('session-7');
    await waitFor(() =>
      expect(screen.getByText('finished:done-1')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText('more'));

    await waitFor(() =>
      expect(screen.getByText('finished:done-1,done-2')).toBeInTheDocument(),
    );
    expect(listFinishedOrderPage).toHaveBeenLastCalledWith('session-7', 1, 20);
    expect(screen.getByText('finishedMore:false')).toBeInTheDocument();
  });

  it('avisa quando a busca de finalizados falha', async () => {
    listFinishedOrderPage.mockResolvedValue(
      left(new FakeError('falha finalizados')),
    );

    renderFinishedProbe('session-7');

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha finalizados'),
    );
  });
});

function AutoProbe({ autoStages }: { autoStages: OrderStage[] }) {
  const { orders } = useKdsOrders('session-7', autoStages);
  return <span>orders:{orders.length}</span>;
}

function renderAutoProbe(autoStages: OrderStage[]) {
  return render(
    <ToastProvider>
      <AutoProbe autoStages={autoStages} />
    </ToastProvider>,
  );
}

describe('useKdsOrders auto stages', () => {
  beforeEach(() => {
    observeSessionOrders.mockReset();
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    unsubscribe.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: [], total: 0, hasMore: false }),
    );
    setOrderStage.mockResolvedValue(right(undefined));
  });
  afterEach(cleanup);

  it('leaves the orders alone when no stage is automated', () => {
    renderAutoProbe([]);
    expect(setOrderStage).not.toHaveBeenCalled();
  });

  it('advances the orders sitting on an automated stage', async () => {
    renderAutoProbe(['aceito']);
    await waitFor(() =>
      expect(setOrderStage).toHaveBeenCalledWith('order-1', 'em_preparo'),
    );
    expect(setOrderStage).toHaveBeenCalledWith('order-2', 'em_preparo');
  });

  it('does not touch orders on stages without automation', async () => {
    renderAutoProbe(['aceito']);
    await waitFor(() => expect(setOrderStage).toHaveBeenCalled());
    expect(setOrderStage).not.toHaveBeenCalledWith(
      'order-3',
      expect.anything(),
    );
  });

  it('cascades across consecutive automated stages', async () => {
    renderAutoProbe(['aceito', 'em_preparo']);
    await waitFor(() =>
      expect(setOrderStage).toHaveBeenCalledWith('order-1', 'a_caminho'),
    );
    expect(setOrderStage).toHaveBeenCalledWith('order-3', 'a_caminho');
  });

  it('never moves a cancelled order', async () => {
    renderAutoProbe(['aceito']);
    await waitFor(() => expect(setOrderStage).toHaveBeenCalled());
    expect(setOrderStage).not.toHaveBeenCalledWith(
      'order-4',
      expect.anything(),
    );
  });

  it('writes once per order even when the list refreshes', async () => {
    const { rerender } = renderAutoProbe(['aceito']);
    await waitFor(() => expect(setOrderStage).toHaveBeenCalledTimes(2));

    rerender(
      <ToastProvider>
        <AutoProbe autoStages={['aceito']} />
      </ToastProvider>,
    );

    await waitFor(() => expect(setOrderStage).toHaveBeenCalledTimes(2));
  });

  it('does not write again while the previous move is still pending', async () => {
    let release: (value: unknown) => void = () => {};
    setOrderStage.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    let emit: (value: Order[]) => void = () => {};
    observeSessionOrders.mockReturnValue({
      subscribe(next: (value: Order[]) => void) {
        emit = next;
        next(ORDERS);
        return { unsubscribe };
      },
    });

    renderAutoProbe(['aceito']);
    await waitFor(() => expect(setOrderStage).toHaveBeenCalledTimes(2));

    await act(async () => {
      emit([...ORDERS]);
    });

    expect(setOrderStage).toHaveBeenCalledTimes(2);
    release(right(undefined));
  });

  it('stops at the last stage when every stage is automated', async () => {
    renderAutoProbe(['aceito', 'em_preparo', 'a_caminho', 'finalizado']);
    await waitFor(() =>
      expect(setOrderStage).toHaveBeenCalledWith('order-1', 'finalizado'),
    );
    expect(setOrderStage).not.toHaveBeenCalledWith(
      'order-1',
      expect.stringMatching(/^(?!finalizado).*$/),
    );
  });
});
