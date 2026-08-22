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
import { PdvPage } from './PdvPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { EmptyCartError } from '../../domain/errors';
import {
  getBusinessType,
  type BusinessTypeDefinition,
} from '../../domain/business-type/registry';
import type { RegisterOrderInput } from '../../application/order/register-order.usecase';

const navigate = vi.fn();
const registerOrder = vi.fn();
const getActiveSession = vi.fn();
const listActiveProducts = vi.fn();
const peekTicketSuggestion = vi.fn();
const searchCustomers = vi.fn();
const loadProductCustomizations = vi.fn();
const readConfig = vi.fn();
const resolveActiveType = vi.fn();
const listOrders = vi.fn();
const openTab = vi.fn();
const addItemsToTab = vi.fn();
const closeTab = vi.fn();
const reopenTab = vi.fn();
const saveCustomer = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../app/container', () => ({
  container: {
    registerOrder: (
      businessTypeId: string,
      definition: BusinessTypeDefinition,
      input: RegisterOrderInput,
    ) => registerOrder(businessTypeId, definition, input),
    getActiveSession: () => getActiveSession(),
    listActiveProducts: () => listActiveProducts(),
    peekTicketSuggestion: () => peekTicketSuggestion(),
    searchCustomers: (value: string) => searchCustomers(value),
    loadProductCustomizations: (ids: number[]) =>
      loadProductCustomizations(ids),
    readConfig: () => readConfig(),
    resolveActiveType: () => resolveActiveType(),
    listOrders: () => listOrders(),
    openTab: (definition: BusinessTypeDefinition, input: unknown) =>
      openTab(definition, input),
    addItemsToTab: (input: unknown) => addItemsToTab(input),
    closeTab: (input: unknown) => closeTab(input),
    reopenTab: (input: unknown) => reopenTab(input),
    saveCustomer: (input: unknown, definition: BusinessTypeDefinition) =>
      saveCustomer(input, definition),
  },
}));

function renderPage(initialEntries = ['/pdv']) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <PdvPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

const simpleProduct = {
  id: 1,
  uid: 'product-1',
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
  uid: 'product-2',
  name: 'X-Burger',
  category: 'Lanches',
  customizationGroupIds: [10],
};

const outOfStockProduct = {
  ...simpleProduct,
  id: 3,
  uid: 'product-3',
  name: 'Guaraná',
  stock: 0,
};

const openTabFixture = {
  id: 9,
  uid: 'tab-1',
  businessTypeId: 'tab',
  sessionUid: 'session-3',
  items: [],
  total: 0,
  paymentMethod: null,
  customerName: 'Maju',
  customerPhone: '',
  ticket: '007',
  stage: 'aceito' as const,
  status: 'open' as const,
  createdAt: 1,
  updatedAt: 1,
};

const customerWithTab = {
  uid: 'customer-7',
  name: 'Maju',
  phone: '',
  addresses: [],
  extra: {},
  createdAt: 1,
  updatedAt: 1,
};

describe('PdvPage', () => {
  beforeEach(() => {
    navigate.mockReset();
    registerOrder.mockReset();
    getActiveSession.mockReset();
    listActiveProducts.mockReset();
    peekTicketSuggestion.mockReset();
    searchCustomers.mockReset();
    loadProductCustomizations.mockReset();
    readConfig.mockReset();
    resolveActiveType.mockReset();
    listOrders.mockReset();
    openTab.mockReset();
    addItemsToTab.mockReset();
    closeTab.mockReset();
    reopenTab.mockReset();
    saveCustomer.mockReset();
    peekTicketSuggestion.mockResolvedValue(right('0001'));
    searchCustomers.mockResolvedValue(right([]));
    loadProductCustomizations.mockResolvedValue(right([]));
    listActiveProducts.mockResolvedValue(right([simpleProduct, customProduct]));
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'tab',
        name: '',
        document: '',
        phone: '',
        address: '',
        ticketCounter: 0,
        ticketLimit: 0,
        ticketAutoReset: false,
        statusControlEnabled: false,
        extra: {},
      }),
    );
    resolveActiveType.mockResolvedValue(right(getBusinessType('tab')));
    listOrders.mockResolvedValue(right([openTabFixture]));
    addItemsToTab.mockResolvedValue(right(openTabFixture));
  });
  afterEach(cleanup);

  it('shows the no-session empty state and navigates to the cash page', async () => {
    getActiveSession.mockResolvedValue(right(null));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Abra o caixa para vender')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir Caixa' }));
    expect(navigate).toHaveBeenCalledWith('/cash');
  });

  it('adds a simple product directly and finalizes a sale', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    registerOrder.mockResolvedValue(right({ id: 1 }));
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
    expect(registerOrder).toHaveBeenCalledWith(
      'tab',
      expect.objectContaining({ id: 'tab' }),
      expect.objectContaining({ sessionUid: 'session-3', status: 'open' }),
    );
  });

  it('keeps the payment panel open when finalize fails and closes it on dismiss', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
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
    expect(registerOrder).not.toHaveBeenCalled();
  });

  it('keeps the payment panel open when the use case returns a Left', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    registerOrder.mockResolvedValue(left(new EmptyCartError()));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Coca'));
    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    );
    expect(registerOrder).toHaveBeenCalled();
    expect(screen.getByText('Como deseja pagar?')).toBeInTheDocument();
  });

  it('opens the customization modal for products with groups and adds the item', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    loadProductCustomizations.mockResolvedValue(
      right([
        {
          id: 10,
          uid: 'group-10',
          name: 'Adicionais',
          required: false,
          minQty: 0,
          maxQty: 3,
          chargeAfter: 0,
          items: [
            {
              id: 100,
              uid: 'item-100',
              groupUid: 'group-10',
              name: 'Bacon',
              price: 3,
              maxQty: 2,
              chargeAfter: 0,
              active: true,
            },
          ],
        },
      ]),
    );
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
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    loadProductCustomizations.mockResolvedValue(right([]));
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

  it('não mostra campo de número de comanda nem no escoteiro', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'scout',
        name: '',
        document: '',
        phone: '',
        address: '',
        ticketCounter: 0,
        ticketLimit: 0,
        ticketAutoReset: false,
        statusControlEnabled: false,
        extra: {},
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    expect(screen.queryByLabelText('Comanda / Mesa')).not.toBeInTheDocument();
  });

  it('hides the ticket field when the active business type has no ordering', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    readConfig.mockResolvedValue(
      right({
        businessTypeId: 'quick_sale',
        name: '',
        document: '',
        phone: '',
        address: '',
        ticketCounter: 0,
        ticketLimit: 0,
        ticketAutoReset: false,
        statusControlEnabled: false,
        extra: {},
      }),
    );
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    expect(screen.queryByLabelText('Comanda / Mesa')).not.toBeInTheDocument();
  });

  it('closes the customization modal without adding', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    loadProductCustomizations.mockResolvedValue(
      right([
        {
          id: 10,
          uid: 'group-10',
          name: 'Adicionais',
          required: false,
          minQty: 0,
          maxQty: 3,
          chargeAfter: 0,
          items: [],
        },
      ]),
    );
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

  it('lança o carrinho na comanda selecionada', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /coca/i }));
    await user.type(screen.getByRole('combobox', { name: 'Comanda' }), 'Maju');
    await user.click(screen.getByRole('option', { name: /Maju/i }));
    await user.click(
      screen.getByRole('button', { name: /lançar na comanda/i }),
    );

    await waitFor(() => expect(addItemsToTab).toHaveBeenCalled());
  });

  it('mantém o carrinho quando lançar na comanda falha', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    addItemsToTab.mockResolvedValue(left(new EmptyCartError()));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /coca/i }));
    await user.type(screen.getByRole('combobox', { name: 'Comanda' }), 'Maju');
    await user.click(screen.getByRole('option', { name: /Maju/i }));
    await user.click(
      screen.getByRole('button', { name: /lançar na comanda/i }),
    );

    await waitFor(() => expect(addItemsToTab).toHaveBeenCalled());
    expect(
      screen.getByRole('button', { name: /lançar na comanda/i }),
    ).toBeInTheDocument();
  });

  it('pré-seleciona a comanda indicada na query string', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    renderPage(['/pdv?tab=tab-1']);

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Comanda' })).toHaveValue(
        '007 — Maju',
      ),
    );
  });

  it('mantém o fluxo de venda avulsa quando não há comanda selecionada', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /coca/i }));

    expect(
      screen.getByRole('button', { name: /finalizar/i }),
    ).toBeInTheDocument();
  });

  it('adiciona ao carrinho normalmente mesmo quando o produto está sem estoque', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    listActiveProducts.mockResolvedValue(
      right([simpleProduct, customProduct, outOfStockProduct]),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Guaraná/ }));

    expect(
      await screen.findByRole('button', { name: /finalizar/i }),
    ).toBeInTheDocument();
  });

  it('cadastra um cliente pelo + e o vincula ao carrinho', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    saveCustomer.mockResolvedValue(
      right({
        uid: 'customer-9',
        name: 'Bento',
        phone: '99887766',
        addresses: [],
        extra: {},
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));

    const dialog = await screen.findByRole('dialog', { name: 'Novo cliente' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Bento');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue(
      'Bento',
    );
  });

  it('fecha o cadastro rápido de cliente sem vincular', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
    await screen.findByRole('dialog', { name: 'Novo cliente' });
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(saveCustomer).not.toHaveBeenCalled();
  });

  it('vai para os pedidos depois de lançar na comanda', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /coca/i }));
    await user.type(screen.getByRole('combobox', { name: 'Comanda' }), 'Maju');
    await user.click(screen.getByRole('option', { name: /Maju/i }));
    await user.click(
      screen.getByRole('button', { name: /lançar na comanda/i }),
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/orders'));
  });

  it('não navega quando lançar na comanda falha', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    addItemsToTab.mockResolvedValue(left(new EmptyCartError()));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /coca/i }));
    await user.type(screen.getByRole('combobox', { name: 'Comanda' }), 'Maju');
    await user.click(screen.getByRole('option', { name: /Maju/i }));
    await user.click(
      screen.getByRole('button', { name: /lançar na comanda/i }),
    );

    await waitFor(() => expect(addItemsToTab).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalledWith('/orders');
  });

  it('propõe a comanda aberta ao vincular o cliente e a seleciona ao confirmar', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    listOrders.mockResolvedValue(
      right([{ ...openTabFixture, customerUid: 'customer-7' }]),
    );
    searchCustomers.mockResolvedValue(right([customerWithTab]));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(
      within(
        await screen.findByRole('listbox', { name: 'Opções para Cliente' }),
      ).getByRole('option', { name: /Maju/i }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Comanda em aberto',
    });
    await user.click(
      within(dialog).getByRole('button', { name: /Usar comanda nº 007/ }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox', { name: 'Comanda' })).toHaveValue(
      '007 — Maju',
    );
  });

  it('segue em venda avulsa ao recusar a comanda aberta', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    listOrders.mockResolvedValue(
      right([{ ...openTabFixture, customerUid: 'customer-7' }]),
    );
    searchCustomers.mockResolvedValue(right([customerWithTab]));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(
      within(
        await screen.findByRole('listbox', { name: 'Opções para Cliente' }),
      ).getByRole('option', { name: /Maju/i }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Comanda em aberto',
    });
    await user.click(
      within(dialog).getByRole('button', { name: 'Continuar venda avulsa' }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox', { name: 'Comanda' })).toHaveValue('');
  });

  it('não propõe comanda quando o cliente vinculado não tem uma aberta', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    searchCustomers.mockResolvedValue(right([customerWithTab]));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(
      within(
        await screen.findByRole('listbox', { name: 'Opções para Cliente' }),
      ).getByRole('option', { name: /Maju/i }),
    );

    expect(
      screen.queryByRole('dialog', { name: 'Comanda em aberto' }),
    ).not.toBeInTheDocument();
  });

  it('propõe a comanda aberta do cliente recém-cadastrado', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    listOrders.mockResolvedValue(
      right([{ ...openTabFixture, customerUid: 'customer-7' }]),
    );
    saveCustomer.mockResolvedValue(right(customerWithTab));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo cliente' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Maju');
    await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

    expect(
      await screen.findByRole('dialog', { name: 'Comanda em aberto' }),
    ).toBeInTheDocument();
  });

  it('abre uma comanda nova, limpa a tela e vai para os pedidos', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const newTab = { ...openTabFixture, ticket: '0001' };
    let opened = false;
    listOrders.mockImplementation(() =>
      Promise.resolve(right(opened ? [newTab] : [])),
    );
    openTab.mockImplementation(() => {
      opened = true;
      return Promise.resolve(right(newTab));
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(screen.getByRole('button', { name: /nova comanda/i }));

    await waitFor(() => expect(openTab).toHaveBeenCalled());
    expect(openTab).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ customerName: 'Maju' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Comanda aberta',
    });
    expect(within(dialog).getByText('0001')).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('button', { name: 'Continuar comprando' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(navigate).toHaveBeenCalledWith('/orders');
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('');
  });

  it('imprime o número da comanda recém-aberta', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    const newTab = { ...openTabFixture, ticket: '0001' };
    let opened = false;
    listOrders.mockImplementation(() =>
      Promise.resolve(right(opened ? [newTab] : [])),
    );
    openTab.mockImplementation(() => {
      opened = true;
      return Promise.resolve(right(newTab));
    });
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(screen.getByRole('button', { name: /nova comanda/i }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Comanda aberta',
    });
    await user.click(
      within(dialog).getByRole('button', { name: /Imprimir número/ }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(navigate).toHaveBeenCalledWith('/orders');
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('');
  });

  it('não seleciona comanda quando a abertura falha', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    openTab.mockResolvedValue(left(new EmptyCartError()));
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await user.type(screen.getByRole('combobox', { name: 'Cliente' }), 'Maju');
    await user.click(screen.getByRole('button', { name: /nova comanda/i }));

    await waitFor(() => expect(openTab).toHaveBeenCalled());
    expect(
      screen.queryByRole('dialog', { name: 'Comanda aberta' }),
    ).not.toBeInTheDocument();
  });

  it('não abre comanda sem cliente informado', async () => {
    getActiveSession.mockResolvedValue(
      right({ id: 3, uid: 'session-3', closedAt: null }),
    );
    renderPage();

    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());

    expect(
      screen.getByRole('button', { name: /nova comanda/i }),
    ).toBeDisabled();
    expect(openTab).not.toHaveBeenCalled();
  });
});
