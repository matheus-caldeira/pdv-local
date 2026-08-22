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
    observeSessionOrders: (sessionUid: string) =>
      observeSessionOrders(sessionUid),
    setOrderStage: (uid: string, stage: string) => setOrderStage(uid, stage),
  },
}));

function makeOrder(partial: Partial<Order>): Order {
  return {
    id: 1,
    uid: 'order-1',
    businessTypeId: 'tab',
    sessionUid: 'session-1',
    items: [
      {
        productUid: 'product-1',
        name: 'X-Burger',
        salePrice: 5,
        costPrice: 1,
        qty: 2,
      },
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
  makeOrder({
    id: 1,
    uid: 'order-1',
    ticket: '001',
    stage: 'aceito',
    customerName: 'Ana',
  }),
  makeOrder({ id: 2, uid: 'order-2', ticket: '002', stage: 'finalizado' }),
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
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    expect(observeSessionOrders).toHaveBeenCalledWith('session-9');
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getAllByText('2x X-Burger').length).toBe(2);
  });

  it('advances a card on the first stage with no back button', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    const card = screen.getByText('#001').closest('div')!.parentElement!;
    expect(
      within(card).queryByRole('button', { name: /Voltar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      within(card).getByRole('button', { name: /Avançar/ }),
    );
    expect(setOrderStage).toHaveBeenCalledWith('order-1', 'em_preparo');
  });

  it('moves a card back from the last stage with no advance button', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    const card = screen.getByText('#002').closest('div')!.parentElement!;
    expect(
      within(card).queryByRole('button', { name: /Avançar/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: /Voltar/ }));
    expect(setOrderStage).toHaveBeenCalledWith('order-2', 'a_caminho');
  });
});

describe('KdsPage collapsible stages', () => {
  beforeEach(() => {
    useSession.mockReset();
    observeSessionOrders.mockReset();
    setOrderStage.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    setOrderStage.mockResolvedValue(right(undefined));
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('starts with every stage expanded', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('#001')).toBeInTheDocument();
  });

  it('hides the cards of a stage collapsed by its title', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );

    expect(screen.queryByText('#001')).toBeNull();
    expect(screen.getByText('#002')).toBeInTheDocument();
  });

  it('expands a collapsed stage again', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Expandir etapa Aceito/ }),
    );

    expect(screen.getByText('#001')).toBeInTheDocument();
  });

  it('keeps the count visible while collapsed', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );

    expect(
      screen.getByRole('button', { name: /Expandir etapa Aceito/ }),
    ).toHaveTextContent('1');
  });

  it('collapses stages independently', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );

    expect(
      screen.getByRole('button', { name: /Recolher etapa Finalizado/ }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('turns the title sideways and narrows the column on desktop', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );

    const header = screen.getByRole('button', {
      name: /Expandir etapa Aceito/,
    });
    expect(header.querySelector('span')).toHaveClass(
      'lg:[writing-mode:vertical-rl]',
    );
    expect(header.parentElement).toHaveClass('lg:w-14');
  });

  it('keeps the title horizontal while expanded', () => {
    renderPage();

    const header = screen.getByRole('button', {
      name: /Recolher etapa Aceito/,
    });
    expect(header.querySelector('span')).not.toHaveClass(
      'lg:[writing-mode:vertical-rl]',
    );
    expect(header.parentElement).not.toHaveClass('lg:w-14');
  });

  it('restores the collapsed stages on the next mount', async () => {
    const first = renderPage();
    await userEvent.click(
      screen.getByRole('button', { name: /Recolher etapa Aceito/ }),
    );
    first.unmount();

    renderPage();

    expect(
      screen.getByRole('button', { name: /Expandir etapa Aceito/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('#001')).toBeNull();
  });
});
