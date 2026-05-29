import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cart } from './Cart';
import type { Customer } from '../../domain/customer/customer.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

const customer: Customer = {
  id: 1,
  name: 'Joao',
  phone: '99887766',
  addresses: ['Rua A, 10', 'Rua B, 20'],
  createdAt: 0,
  updatedAt: 0,
};

function baseProps() {
  return {
    cart: [] as CartItem[],
    total: 0,
    customerName: '',
    onCustomerNameChange: vi.fn(),
    phone: '',
    onPhoneChange: vi.fn(),
    address: '',
    onAddressChange: vi.fn(),
    ticket: '0001',
    onTicketChange: vi.fn(),
    matchedCustomer: null as Customer | null,
    customerSuggestions: [] as Customer[],
    onSelectCustomer: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
    onSetObservation: vi.fn(),
    onFinalize: vi.fn(),
  };
}

const cartItem: CartItem = {
  cartId: 'a',
  productId: 1,
  name: 'X-Burger',
  salePrice: 20,
  costPrice: 5,
  qty: 2,
  observation: 'Sem cebola',
  customizationTotal: 3,
  customizations: [
    { groupName: 'Adicionais', items: [{ name: 'Bacon', qty: 2, price: 3 }] },
  ],
};

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
        { groupName: 'Molho', items: [{ name: 'Maionese', qty: 1, price: 0 }] },
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
    await userEvent.click(screen.getByRole('button', { name: 'Anotacao' }));
    const textarea = screen.getByLabelText('Anotacao do item');
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
    await userEvent.click(screen.getByRole('button', { name: 'Anotacao' }));
    expect(screen.getByLabelText('Anotacao do item')).toHaveValue('');
  });

  it('closes the observation modal via Escape without saving', async () => {
    const props = baseProps();
    render(<Cart {...props} cart={[cartItem]} total={46} />);
    await userEvent.click(screen.getByRole('button', { name: 'Anotacao' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(props.onSetObservation).not.toHaveBeenCalled();
  });

  it('shows phone suggestions and selects a customer', async () => {
    const props = baseProps();
    render(<Cart {...props} customerSuggestions={[customer]} />);
    expect(screen.getByText('Joao')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Joao'));
    expect(props.onSelectCustomer).toHaveBeenCalledWith(customer);
  });

  it('renders the address select for a matched customer with addresses', async () => {
    const props = baseProps();
    render(<Cart {...props} matchedCustomer={customer} address="Rua A, 10" />);
    const select = screen.getByLabelText('Endereco do cliente');
    expect(select).toBeInTheDocument();
    await userEvent.selectOptions(select, '__new__');
    expect(props.onAddressChange).toHaveBeenCalledWith('__new__');
    expect(
      screen.queryByLabelText('Endereco (opcional)'),
    ).not.toBeInTheDocument();
  });

  it('shows the new-address input when address is __new__', () => {
    render(
      <Cart {...baseProps()} matchedCustomer={customer} address="__new__" />,
    );
    expect(screen.getByLabelText('Endereco (opcional)')).toHaveValue('');
  });

  it('forwards typing in the form fields', async () => {
    const props = baseProps();
    render(<Cart {...props} />);
    await userEvent.type(screen.getByLabelText('Telefone do cliente'), '9');
    await userEvent.type(
      screen.getByLabelText('Nome do cliente (opcional)'),
      'A',
    );
    await userEvent.type(screen.getByLabelText('Comanda / Mesa'), '5');
    await userEvent.type(screen.getByLabelText('Endereco (opcional)'), 'R');
    expect(props.onPhoneChange).toHaveBeenCalled();
    expect(props.onCustomerNameChange).toHaveBeenCalled();
    expect(props.onTicketChange).toHaveBeenCalled();
    expect(props.onAddressChange).toHaveBeenCalled();
  });
});
