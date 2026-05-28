import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PdvPage } from './PdvPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { EmptyCartError } from '../../domain/errors';
import type { FinalizeOrderInput } from '../../application/order/finalize-order.usecase';

const navigate = vi.fn();
const finalizeOrder = vi.fn();

const sessionsToArray = vi.fn();
const productsToArray = vi.fn();
const configGet = vi.fn();
const customersToArray = vi.fn();
const groupGet = vi.fn();
const itemsToArray = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../app/container', () => ({
  container: {
    finalizeOrder: (input: FinalizeOrderInput) => finalizeOrder(input),
  },
}));

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({
    sessions: { toArray: sessionsToArray },
    products: {
      filter: () => ({ toArray: productsToArray }),
    },
    config: { get: configGet },
    customers: { toArray: customersToArray },
    customizationGroups: { get: groupGet },
    customizationItems: {
      where: () => ({ equals: () => ({ toArray: itemsToArray }) }),
    },
  }),
}));

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <PdvPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

const simpleProduct = {
  id: 1,
  name: 'Coca',
  category: 'Bebidas',
  costPrice: 2,
  salePrice: 5,
  stock: 10,
  active: true,
  customizationGroupIds: [],
  createdAt: 0,
  updatedAt: 0,
};

const customProduct = {
  ...simpleProduct,
  id: 2,
  name: 'X-Burger',
  category: 'Lanches',
  customizationGroupIds: [10],
};

describe('PdvPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    finalizeOrder.mockReset();
    sessionsToArray.mockReset();
    productsToArray.mockReset();
    configGet.mockReset();
    customersToArray.mockReset();
    groupGet.mockReset();
    itemsToArray.mockReset();
    configGet.mockResolvedValue({ ticketCounter: 1, ticketLimit: 9999 });
    productsToArray.mockResolvedValue([simpleProduct, customProduct]);
  });
  afterEach(cleanup);

  it('shows the no-session empty state and navigates to the cash page', async () => {
    sessionsToArray.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abra o caixa para vender')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Caixa' }));
    expect(navigate).toHaveBeenCalledWith('/cash');
  });

  it('adds a simple product directly and finalizes a sale', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    finalizeOrder.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Coca'));
    expect(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    );

    await waitFor(() =>
      expect(screen.queryByText('Como deseja pagar?')).not.toBeInTheDocument(),
    );
    expect(finalizeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 3, status: 'open' }),
    );
  });

  it('keeps the payment panel open when finalize fails and closes it on dismiss', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Coca'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    expect(screen.getByText('Como deseja pagar?')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByText('Como deseja pagar?')).not.toBeInTheDocument(),
    );
    expect(finalizeOrder).not.toHaveBeenCalled();
  });

  it('keeps the payment panel open when the use case returns a Left', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    finalizeOrder.mockResolvedValue(left(new EmptyCartError()));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Coca'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    );
    expect(finalizeOrder).toHaveBeenCalled();
    expect(screen.getByText('Como deseja pagar?')).toBeInTheDocument();
  });

  it('opens the customization modal for products with groups and adds the item', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    groupGet.mockResolvedValue({
      id: 10,
      name: 'Adicionais',
      required: false,
      minQty: 0,
      maxQty: 3,
      chargeAfter: 0,
    });
    itemsToArray.mockResolvedValue([
      {
        id: 100,
        groupId: 10,
        name: 'Bacon',
        price: 3,
        maxQty: 2,
        chargeAfter: 0,
        active: true,
      },
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('X-Burger')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByText('X-Burger'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^Adicionar ·/ }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    ).toBeInTheDocument();
  });

  it('adds directly when a customizable product has no loadable groups', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    groupGet.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('X-Burger')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('X-Burger'));
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Finalizar Venda' }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the customization modal without adding', async () => {
    sessionsToArray.mockResolvedValue([{ id: 3, closedAt: null }]);
    groupGet.mockResolvedValue({
      id: 10,
      name: 'Adicionais',
      required: false,
      minQty: 0,
      maxQty: 3,
      chargeAfter: 0,
    });
    itemsToArray.mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('X-Burger')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByText('X-Burger'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
