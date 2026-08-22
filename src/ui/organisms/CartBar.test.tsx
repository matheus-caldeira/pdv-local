import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartBar } from './CartBar';
import type { Customer } from '../../domain/customer/customer.entity';
import type { Order } from '../../domain/order/order.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

const item: CartItem = {
  cartId: 'a',
  productUid: 'product-1',
  name: 'Coxinha',
  salePrice: 5,
  costPrice: 2,
  qty: 3,
};

const tab = { uid: 'tab-1', ticket: '0012' } as Order;

function baseProps() {
  return {
    cart: [] as CartItem[],
    total: 0,
    customerName: '',
    onCustomerNameChange: vi.fn(),
    customerSuggestions: [] as Customer[],
    onSelectCustomer: vi.fn(),
    ordering: 'optional' as const,
    selectedTab: null as Order | null,
    onExpand: vi.fn(),
    onOpenTab: vi.fn(),
    onFinalize: vi.fn(),
    onCreateCustomer: vi.fn(),
    onClearCart: vi.fn(),
  };
}

describe('CartBar', () => {
  it('fica acima do menu de navegação', () => {
    render(<CartBar {...baseProps()} />);

    const bar = screen.getByTestId('cart-bar');
    expect(bar.className).toContain('var(--nav-bottom-height)');
    expect(bar.className).toContain('z-[110]');
  });

  it('mostra o nome do cliente no campo', () => {
    render(<CartBar {...baseProps()} customerName="Maju" />);

    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue(
      'Maju',
    );
  });

  it('mostra o número da comanda selecionada', () => {
    render(<CartBar {...baseProps()} selectedTab={tab} />);

    expect(screen.getByText('nº 0012')).toBeInTheDocument();
  });

  it('esconde o número quando não há comanda selecionada', () => {
    render(<CartBar {...baseProps()} />);

    expect(screen.queryByText(/nº /)).not.toBeInTheDocument();
  });

  it('busca e vincula o cliente pelo campo da barra', async () => {
    const props = baseProps();
    const customer: Customer = {
      uid: 'customer-1',
      name: 'Maju',
      addresses: [],
      extra: {},
      createdAt: 1,
      updatedAt: 1,
    };
    render(
      <CartBar {...props} customerName="Ma" customerSuggestions={[customer]} />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Cliente' }));
    await userEvent.click(screen.getByRole('option', { name: /Maju/ }));

    expect(props.onSelectCustomer).toHaveBeenCalledWith(customer);
  });

  it('encaminha o nome digitado sem vincular ninguém', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Cliente' }),
      'F',
    );

    expect(props.onCustomerNameChange).toHaveBeenCalledWith('F');
    expect(props.onSelectCustomer).not.toHaveBeenCalled();
  });

  it('avisa quando não há itens', () => {
    render(<CartBar {...baseProps()} />);

    expect(screen.getByText('Nenhum item')).toBeInTheDocument();
  });

  it('mostra a contagem e o total', () => {
    render(<CartBar {...baseProps()} cart={[item]} total={15} />);

    expect(screen.getByText('3 itens')).toBeInTheDocument();
    expect(screen.getByText('R$ 15,00')).toBeInTheDocument();
  });

  it('usa o singular com um item só', () => {
    render(<CartBar {...baseProps()} cart={[{ ...item, qty: 1 }]} total={5} />);

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('expande a lista ao tocar no resumo', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(screen.getByText('3 itens'));

    expect(props.onExpand).toHaveBeenCalledTimes(1);
  });

  it('não expande quando o carrinho está vazio', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(screen.getByText('Nenhum item'));

    expect(props.onExpand).not.toHaveBeenCalled();
  });

  it('impede abrir comanda sem cliente informado', () => {
    render(<CartBar {...baseProps()} />);

    expect(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    ).toBeDisabled();
  });

  it('abre a comanda quando há cliente', async () => {
    const props = baseProps();
    render(<CartBar {...props} customerName="Maju" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    );

    expect(props.onOpenTab).toHaveBeenCalledTimes(1);
  });

  it('mostra lançar na comanda quando há comanda selecionada', () => {
    render(
      <CartBar {...baseProps()} cart={[item]} total={15} selectedTab={tab} />,
    );

    expect(
      screen.getByRole('button', { name: 'Lançar na comanda nº 0012' }),
    ).toBeEnabled();
  });

  it('impede lançar na comanda sem itens', () => {
    render(<CartBar {...baseProps()} selectedTab={tab} />);

    expect(
      screen.getByRole('button', { name: 'Lançar na comanda nº 0012' }),
    ).toBeDisabled();
  });

  it('esconde a comanda quando o negócio não usa comandas', () => {
    render(<CartBar {...baseProps()} ordering="none" />);

    expect(
      screen.queryByRole('button', { name: 'Abrir comanda' }),
    ).not.toBeInTheDocument();
  });

  it('impede finalizar sem itens', () => {
    render(<CartBar {...baseProps()} />);

    expect(
      screen.getByRole('button', { name: 'Finalizar venda' }),
    ).toBeDisabled();
  });

  it('finaliza a venda', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Finalizar venda' }),
    );

    expect(props.onFinalize).toHaveBeenCalledTimes(1);
  });

  it('abre o cadastro de cliente pelo ícone', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar cliente' }),
    );

    expect(props.onCreateCustomer).toHaveBeenCalledTimes(1);
  });

  it('limpa o carrinho pelo menu de mais ações', async () => {
    const props = baseProps();
    render(<CartBar {...props} cart={[item]} total={15} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Limpar carrinho' }),
    );

    expect(props.onClearCart).toHaveBeenCalledTimes(1);
  });

  it('impede limpar carrinho vazio', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));

    expect(
      screen.getByRole('button', { name: 'Limpar carrinho' }),
    ).toBeDisabled();
  });

  it('fecha o menu de mais ações pelo Escape', async () => {
    render(<CartBar {...baseProps()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
