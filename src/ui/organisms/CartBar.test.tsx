import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartBar } from './CartBar';
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
    ordering: 'optional' as const,
    selectedTab: null as Order | null,
    onExpand: vi.fn(),
    onOpenCustomer: vi.fn(),
    onOpenTab: vi.fn(),
    onFinalize: vi.fn(),
    onCreateCustomer: vi.fn(),
    onClearCart: vi.fn(),
  };
}

describe('CartBar', () => {
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

  it('abre o cliente', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cliente' }));

    expect(props.onOpenCustomer).toHaveBeenCalledTimes(1);
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

  it('cadastra cliente pelo menu de mais ações', async () => {
    const props = baseProps();
    render(<CartBar {...props} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mais ações' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Cadastrar cliente' }),
    );

    expect(props.onCreateCustomer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
