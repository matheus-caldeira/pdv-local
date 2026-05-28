import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KdsPage } from './KdsPage';
import { ToastProvider } from '../molecules/Toast';
import { right } from '../../domain/shared/either';
import type { Order } from '../../domain/order/order.entity';

const useSession = vi.fn();
const observeSessionOrders = vi.fn();
const setOrderStage = vi.fn();

vi.mock('../hooks/useSession', () => ({
  useSession: () => useSession(),
}));

vi.mock('../../app/container', () => ({
  container: {
    observeSessionOrders: (sessionId: number) =>
      observeSessionOrders(sessionId),
    setOrderStage: (id: number, stage: string) => setOrderStage(id, stage),
  },
}));

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    sessionId: 1,
    items: [
      { productId: 1, name: 'X-Burger', salePrice: 5, costPrice: 1, qty: 2 },
    ],
    total: 10,
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
  makeOrder({ id: 1, ticket: '001', stage: 'aceito', customerName: 'Ana' }),
  makeOrder({ id: 2, ticket: '002', stage: 'finalizado' }),
];

function fakeObservable(orders: Order[]) {
  return {
    subscribe(next: (value: Order[]) => void) {
      next(orders);
      return { unsubscribe: vi.fn() };
    },
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <KdsPage />
    </ToastProvider>,
  );
}

describe('KdsPage', () => {
  beforeEach(() => {
    useSession.mockReset();
    observeSessionOrders.mockReset();
    setOrderStage.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    setOrderStage.mockResolvedValue(right(undefined));
  });
  afterEach(cleanup);

  it('shows the open-cash hint when there is no session', () => {
    useSession.mockReturnValue({ activeSession: null, loading: false });
    renderPage();
    expect(
      screen.getByText('Abra o caixa para gerenciar pedidos.'),
    ).toBeInTheDocument();
    expect(observeSessionOrders).not.toHaveBeenCalled();
  });

  it('renders the board with cards and item summaries', () => {
    useSession.mockReturnValue({
      activeSession: { id: 9 },
      loading: false,
    });
    renderPage();
    expect(observeSessionOrders).toHaveBeenCalledWith(9);
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getAllByText('2x X-Burger').length).toBe(2);
  });

  it('advances a card on the first stage with no back button', async () => {
    useSession.mockReturnValue({ activeSession: { id: 9 }, loading: false });
    renderPage();
    const card = screen.getByText('#001').closest('div')!.parentElement!;
    expect(
      within(card).queryByRole('button', { name: /Voltar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole('button', { name: /Avancar/ }),
    );
    expect(setOrderStage).toHaveBeenCalledWith(1, 'em_preparo');
  });

  it('moves a card back from the last stage with no advance button', async () => {
    useSession.mockReturnValue({ activeSession: { id: 9 }, loading: false });
    renderPage();
    const card = screen.getByText('#002').closest('div')!.parentElement!;
    expect(
      within(card).queryByRole('button', { name: /Avancar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: /Voltar/ }));
    expect(setOrderStage).toHaveBeenCalledWith(2, 'a_caminho');
  });
});
