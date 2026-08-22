import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cart } from './Cart';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

const customer: Customer = {
  id: 1,
  uid: 'customer-1',
  name: 'Joao',
  phone: '99887766',
  addresses: ['Rua A, 10', 'Rua B, 20'],
  extra: {},
  createdAt: 0,
  updatedAt: 0,
};

function baseProps() {
  return {
    cart: [] as CartItem[],
    total: 0,
    customerName: '',
    onCustomerNameChange: vi.fn(),
    customerSuggestions: [] as Customer[],
    onSelectCustomer: vi.fn(),
    onCreateCustomer: vi.fn(),
    address: '',
    onAddressChange: vi.fn(),
    showAddress: false,
    matchedCustomer: null as Customer | null,
    ticket: '0001',
    onTicketChange: vi.fn(),
    ordering: 'required' as const,
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
    onSetObservation: vi.fn(),
    onFinalize: vi.fn(),
    onOpenNewTab: vi.fn(),
  };
}

const cartItem: CartItem = {
  cartId: 'a',
  productUid: 'product-1',
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 5,
  qty: 2,
  observation: 'Sem cebola',
  customizationTotal: 3,
  customizations: [
    { groupName: 'Adicionais', name: 'Bacon', qty: 2, price: 3 },
  ],
};

const selectedTab = { uid: 'tab-1', ticket: '0012' } as Order;

describe('Cart', () => {
  it('shows the empty state and hides the footer', () => {
    render(<Cart {...baseProps()} />);
    expect(
      screen.getByText('Toque nos produtos para adicionar'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finalizar Venda' }),
    ).not.toBeInTheDocument();
  });

  it('renders an item with customizations, observation and totals', () => {
    render(<Cart {...baseProps()} cart={[cartItem]} total={46} />);
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.getByText('2x Bacon')).toBeInTheDocument();
    expect(screen.getByText('Obs: Sem cebola')).toBeInTheDocument();
    expect(screen.getByText('R$ 23,00')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 46,00')).toHaveLength(2);
  });

  it('renders a single-qty customization without a multiplier prefix', () => {
    const single: CartItem = {
      ...cartItem,
      cartId: 'b',
      observation: undefined,
      customizations: [
        { groupName: 'Molho', name: 'Maionese', qty: 1, price: 0 },
      ],
    };
    render(<Cart {...baseProps()} cart={[single]} total={23} />);
    expect(screen.getByText('Maionese')).toBeInTheDocument();
    expect(
      screen.queryByText('Obs:', { exact: false }),
    ).not.toBeInTheDocument();
  });

  it('triggers qty, remove and finalize callbacks', async () => {
    const props = baseProps();
    render(<Cart {...props} cart={[cartItem]} total={46} />);
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Diminuir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover item' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    expect(props.onUpdateQty).toHaveBeenCalledWith('a', 1);
    expect(props.onUpdateQty).toHaveBeenCalledWith('a', -1);
    expect(props.onRemoveItem).toHaveBeenCalledWith('a');
    expect(props.onFinalize).toHaveBeenCalledOnce();
  });

  it('opens the observation modal and saves', async () => {
    const props = baseProps();
    render(<Cart {...props} cart={[cartItem]} total={46} />);
    await userEvent.click(screen.getByRole('button', { name: 'Anotação' }));
    const textarea = screen.getByLabelText('Anotação do item');
    expect(textarea).toHaveValue('Sem cebola');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Bem passado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(props.onSetObservation).toHaveBeenCalledWith('a', 'Bem passado');
  });

  it('opens the observation modal for an item without observation', async () => {
    const props = baseProps();
    const noObs: CartItem = { ...cartItem, observation: undefined };
    render(<Cart {...props} cart={[noObs]} total={46} />);
    await userEvent.click(screen.getByRole('button', { name: 'Anotação' }));
    expect(screen.getByLabelText('Anotação do item')).toHaveValue('');
  });

  it('closes the observation modal via Escape without saving', async () => {
    const props = baseProps();
    render(<Cart {...props} cart={[cartItem]} total={46} />);
    await userEvent.click(screen.getByRole('button', { name: 'Anotação' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.onSetObservation).not.toHaveBeenCalled();
  });

  it('busca o cliente pelo campo único e seleciona uma sugestão', async () => {
    const props = baseProps();
    render(<Cart {...props} customerSuggestions={[customer]} />);
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Cliente' }),
      'Jo',
    );
    expect(props.onCustomerNameChange).toHaveBeenCalledWith('J');
    await userEvent.click(screen.getByRole('option', { name: /Joao/ }));
    expect(props.onSelectCustomer).toHaveBeenCalledWith(customer);
  });

  it('mostra nome, seção e responsável na sugestão de cliente', async () => {
    const scout: Customer = {
      ...customer,
      name: 'Maju',
      extra: { section: 'lobinho', guardian: 'Ana' },
    };
    render(<Cart {...baseProps()} customerSuggestions={[scout]} />);

    await userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));

    expect(
      screen.getByRole('option', { name: /Maju - Lobinho - Ana/ }),
    ).toBeInTheDocument();
  });

  it('abre o cadastro de cliente pelo botão +', async () => {
    const props = baseProps();
    render(<Cart {...props} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar cliente' }),
    );
    expect(props.onCreateCustomer).toHaveBeenCalledTimes(1);
  });

  it('esconde o endereço quando o negócio não é delivery', () => {
    render(<Cart {...baseProps()} showAddress={false} />);
    expect(screen.queryByLabelText('Endereço')).not.toBeInTheDocument();
  });

  it('mostra e edita o endereço quando o negócio é delivery', async () => {
    const props = baseProps();
    render(<Cart {...props} showAddress address="Rua A, 10" />);
    const field = screen.getByLabelText('Endereço');
    expect(field).toHaveValue('Rua A, 10');
    await userEvent.type(field, '0');
    expect(props.onAddressChange).toHaveBeenCalledWith('Rua A, 100');
  });

  it('não mostra mais o telefone no carrinho', () => {
    render(<Cart {...baseProps()} />);
    expect(
      screen.queryByLabelText('Telefone do cliente'),
    ).not.toBeInTheDocument();
  });

  it('não pede o número da comanda em nenhum tipo de negócio', () => {
    render(<Cart {...baseProps()} ordering="required" />);
    expect(screen.queryByLabelText('Comanda / Mesa')).not.toBeInTheDocument();
  });

  it('mostra os dois botões quando há comanda selecionada', async () => {
    const props = baseProps();
    const onLaunchToTab = vi.fn();
    render(
      <Cart
        {...props}
        cart={[cartItem]}
        total={46}
        selectedTab={selectedTab}
        onLaunchToTab={onLaunchToTab}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Lançar na comanda nº 0012' }),
    );
    expect(onLaunchToTab).toHaveBeenCalledOnce();

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    );
    expect(props.onFinalize).toHaveBeenCalledOnce();
  });

  it('mostra só finalizar quando não há comanda selecionada', () => {
    render(<Cart {...baseProps()} cart={[cartItem]} total={46} />);
    expect(
      screen.getByRole('button', { name: 'Finalizar Venda' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Lançar na comanda/ }),
    ).not.toBeInTheDocument();
  });

  it('abre uma comanda nova pelo rodapé quando o negócio usa comandas', async () => {
    const props = baseProps();
    render(<Cart {...props} ordering="optional" customerName="Maju" />);
    await userEvent.click(screen.getByRole('button', { name: 'Nova comanda' }));
    expect(props.onOpenNewTab).toHaveBeenCalledTimes(1);
  });

  it('impede abrir comanda sem cliente informado', () => {
    render(<Cart {...baseProps()} ordering="optional" customerName="" />);

    expect(screen.getByRole('button', { name: 'Nova comanda' })).toBeDisabled();
    expect(
      screen.getByText('Informe o cliente para abrir uma comanda'),
    ).toBeInTheDocument();
  });

  it('esconde a nova comanda quando o negócio não usa comandas', () => {
    render(<Cart {...baseProps()} ordering="none" />);
    expect(
      screen.queryByRole('button', { name: 'Nova comanda' }),
    ).not.toBeInTheDocument();
  });
});
