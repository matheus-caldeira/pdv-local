import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KdsPage } from './KdsPage';
import { ToastProvider } from '../molecules/Toast';
import { right } from '../../domain/shared/either';
import type { Order } from '../../domain/order/order.entity';

const useSession = vi.fn();
const observeSessionOrders = vi.fn();
const listFinishedOrderPage = vi.fn();
const setOrderStage = vi.fn();

vi.mock('../hooks/useSession', () => ({
  useSession: () => useSession(),
}));

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
];

const FINISHED: Order[] = [
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
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: FINISHED, total: FINISHED.length, hasMore: false }),
    );
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

  it('renders the board with cards and item summaries', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    expect(observeSessionOrders).toHaveBeenCalledWith('session-9');
    expect(screen.getByText('#001')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText('2x X-Burger').length).toBe(2),
    );
  });

  it('busca os finalizados paginados da sessão', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    await waitFor(() =>
      expect(listFinishedOrderPage).toHaveBeenCalledWith('session-9', 0, 20),
    );
    expect(screen.getByText('#002')).toBeInTheDocument();
  });

  it('oferece carregar mais quando há finalizados além da página', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    listFinishedOrderPage.mockResolvedValueOnce(
      right({ orders: FINISHED, total: 40, hasMore: true }),
    );
    listFinishedOrderPage.mockResolvedValueOnce(
      right({
        orders: [makeOrder({ id: 3, uid: 'order-3', ticket: '003' })],
        total: 40,
        hasMore: false,
      }),
    );

    renderPage();
    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());

    await userEvent.click(
      screen.getByRole('button', { name: 'Carregar mais' }),
    );

    await waitFor(() => expect(screen.getByText('#003')).toBeInTheDocument());
    expect(listFinishedOrderPage).toHaveBeenLastCalledWith('session-9', 1, 20);
  });

  it('não oferece carregar mais na última página de finalizados', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());

    expect(
      screen.queryByRole('button', { name: 'Carregar mais' }),
    ).not.toBeInTheDocument();
  });

  it('conta o total de finalizados, não só os carregados', async () => {
    useSession.mockReturnValue({
      activeSession: { uid: 'session-9' },
      loading: false,
    });
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: FINISHED, total: 40, hasMore: true }),
    );

    renderPage();

    await waitFor(() => expect(screen.getByText('40')).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());
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
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: FINISHED, total: FINISHED.length, hasMore: false }),
    );
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
    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());
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
    expect(header.closest('.lg\\:w-14')).not.toBeNull();
  });

  it('keeps the title horizontal while expanded', () => {
    renderPage();

    const header = screen.getByRole('button', {
      name: /Recolher etapa Aceito/,
    });
    expect(header.querySelector('span')).not.toHaveClass(
      'lg:[writing-mode:vertical-rl]',
    );
    expect(header.closest('.lg\\:w-14')).toBeNull();
  });

  it('offers the automation toggle on stages that have a next one', () => {
    renderPage();
    expect(
      screen.getByRole('button', {
        name: /Ativar avanço automático de Aceito/,
      }),
    ).toBeInTheDocument();
  });

  it('omits the automation toggle on the last stage', () => {
    renderPage();
    expect(
      screen.queryByRole('button', {
        name: /avanço automático de Finalizado/,
      }),
    ).toBeNull();
  });

  it('advances the orders of a stage once its automation is on', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Ativar avanço automático de Aceito/,
      }),
    );

    await waitFor(() =>
      expect(setOrderStage).toHaveBeenCalledWith('order-1', 'em_preparo'),
    );
  });

  it('turns the automation off again', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: /Ativar avanço automático de Aceito/,
      }),
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: /Desativar avanço automático de Aceito/,
      }),
    );

    expect(
      screen.getByRole('button', {
        name: /Ativar avanço automático de Aceito/,
      }),
    ).toBeInTheDocument();
  });

  it('restores the automation choice on the next mount', async () => {
    const first = renderPage();
    await userEvent.click(
      screen.getByRole('button', {
        name: /Ativar avanço automático de Aceito/,
      }),
    );
    first.unmount();
    setOrderStage.mockClear();

    renderPage();

    expect(
      screen.getByRole('button', {
        name: /Desativar avanço automático de Aceito/,
      }),
    ).toBeInTheDocument();
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

describe('KdsPage stage move modal', () => {
  beforeEach(() => {
    useSession.mockReset();
    observeSessionOrders.mockReset();
    listFinishedOrderPage.mockReset();
    setOrderStage.mockReset();
    observeSessionOrders.mockReturnValue(fakeObservable(ORDERS));
    listFinishedOrderPage.mockResolvedValue(
      right({ orders: FINISHED, total: FINISHED.length, hasMore: false }),
    );
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

  it('opens the stage picker from the card menu', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Mover pedido #001 para outra etapa',
      }),
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Mover pedido #001',
    );
  });

  it('moves the order to the stage chosen in the modal', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Mover pedido #001 para outra etapa',
      }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /Finalizado/,
      }),
    );

    expect(setOrderStage).toHaveBeenCalledWith('order-1', 'finalizado');
  });

  it('closes the modal after moving', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Mover pedido #001 para outra etapa',
      }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /Finalizado/,
      }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes the modal on cancel without moving', async () => {
    renderPage();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Mover pedido #001 para outra etapa',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(setOrderStage).not.toHaveBeenCalled();
  });

  it('goes back directly when the previous stage has no automation', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());

    const card = screen.getByText('#002').closest('div')!.parentElement!;
    await userEvent.click(within(card).getByRole('button', { name: /Voltar/ }));

    expect(setOrderStage).toHaveBeenCalledWith('order-2', 'a_caminho');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the modal instead of going back into an automated stage', async () => {
    renderPage();
    await userEvent.click(
      screen.getByRole('button', {
        name: /Ativar avanço automático de A caminho/,
      }),
    );
    setOrderStage.mockClear();

    await waitFor(() => expect(screen.getByText('#002')).toBeInTheDocument());
    const card = screen.getByText('#002').closest('div')!.parentElement!;
    await userEvent.click(within(card).getByRole('button', { name: /Voltar/ }));

    expect(setOrderStage).not.toHaveBeenCalled();
    expect(
      screen.getByText(/A caminho avança automaticamente/),
    ).toBeInTheDocument();
  });
});
