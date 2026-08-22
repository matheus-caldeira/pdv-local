import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from './ProductGrid';
import type { Product } from '../../domain/product/product.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

function make(
  partial: Partial<Product> & { id: number; name: string },
): Product {
  return {
    uid: `product-${partial.id}`,
    category: 'Lanches',
    costPrice: 1,
    salePrice: 10,
    stock: 5,
    tracksStock: true,
    active: true,
    customizationGroupIds: [],
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

const products: Product[] = [
  make({
    id: 1,
    name: 'X-Burger',
    category: 'Lanches',
    customizationGroupIds: [7],
  }),
  make({ id: 2, name: 'Coca', category: 'Bebidas' }),
  make({ id: 3, name: 'Sem categoria', category: '' }),
];

describe('ProductGrid', () => {
  it('shows the empty state when there are no products at all', () => {
    render(<ProductGrid products={[]} cart={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('Cadastre produtos primeiro')).toBeInTheDocument();
  });

  it('renders category pills, a custom badge and an in-cart qty badge', () => {
    const cart: CartItem[] = [
      {
        cartId: 'a',
        productUid: 'product-1',
        name: 'X-Burger',
        salePrice: 10,
        costPrice: 1,
        qty: 2,
      },
    ];
    render(<ProductGrid products={products} cart={cart} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bebidas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lanches' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('filters by category and shows the per-category empty state', async () => {
    const onlyLanches = products.filter((p) => p.category === 'Lanches');
    render(<ProductGrid products={onlyLanches} cart={[]} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Lanches' }));
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
  });

  it('switches category and back to Todos', async () => {
    render(<ProductGrid products={products} cart={[]} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.getByText('Coca')).toBeInTheDocument();
    expect(screen.queryByText('X-Burger')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
  });

  it('shows the category empty state when the selected category no longer has products', async () => {
    const withBebidas = [
      make({ id: 9, name: 'Only', category: 'Lanches' }),
      make({ id: 10, name: 'Suco', category: 'Bebidas' }),
    ];
    const { rerender } = render(
      <ProductGrid products={withBebidas} cart={[]} onSelect={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.getByText('Suco')).toBeInTheDocument();
    rerender(
      <ProductGrid
        products={[make({ id: 9, name: 'Only', category: 'Lanches' })]}
        cart={[]}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByText('Nenhum produto nesta categoria'),
    ).toBeInTheDocument();
  });

  it('calls onSelect when a product is clicked', async () => {
    const onSelect = vi.fn();
    render(<ProductGrid products={products} cart={[]} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Coca'));
    expect(onSelect).toHaveBeenCalledWith(products[1]);
  });

  it('does not render category pills when no product has a category', () => {
    const noCats = [make({ id: 1, name: 'X', category: '' })];
    render(<ProductGrid products={noCats} cart={[]} onSelect={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: 'Todos' }),
    ).not.toBeInTheDocument();
  });

  it('mostra a quantidade em estoque quando o produto controla estoque e tem saldo positivo', () => {
    render(
      <ProductGrid
        products={[make({ id: 1, name: 'Coca', stock: 12, tracksStock: true })]}
        cart={[]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('12 un.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sem estoque')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Estoque negativo')).not.toBeInTheDocument();
  });

  it('mostra badge "Sem estoque" quando o estoque é zero, mas ainda permite adicionar ao carrinho', async () => {
    const onSelect = vi.fn();
    render(
      <ProductGrid
        products={[make({ id: 1, name: 'Coca', stock: 0, tracksStock: true })]}
        cart={[]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByLabelText('Sem estoque')).toBeInTheDocument();
    expect(screen.getByText('0 un.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Coca/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Coca' }),
    );
  });

  it('mostra badge "Estoque negativo" quando o estoque é negativo, e ainda assim vende', async () => {
    const onSelect = vi.fn();
    render(
      <ProductGrid
        products={[make({ id: 1, name: 'Coca', stock: -3, tracksStock: true })]}
        cart={[]}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByLabelText('Estoque negativo')).toBeInTheDocument();
    expect(screen.getByText('-3 un.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Coca/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('não mostra quantidade quando o produto não controla estoque', () => {
    render(
      <ProductGrid
        products={[
          make({ id: 1, name: 'Servico', stock: 0, tracksStock: false }),
        ]}
        cart={[]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByText(/un\./)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sem estoque')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Estoque negativo')).not.toBeInTheDocument();
  });

  it('adiciona normalmente quando há estoque', async () => {
    const onSelect = vi.fn();
    render(
      <ProductGrid
        products={[make({ id: 1, name: 'Coca', stock: 3 })]}
        cart={[]}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Coca/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('ProductGrid linear', () => {
  const linearProducts: Product[] = [
    make({ id: 1, name: 'X-Burger', category: 'Lanches' }),
    make({ id: 2, name: 'Coca', category: 'Bebidas' }),
    make({ id: 3, name: 'Suco', category: 'Bebidas' }),
    make({ id: 4, name: 'Avulso', category: '' }),
  ];

  it('agrupa os produtos em seções por categoria', () => {
    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={vi.fn()}
        linear
      />,
    );

    expect(screen.getByRole('region', { name: 'Bebidas' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lanches' })).toBeInTheDocument();
  });

  it('agrupa produtos sem categoria em Outros', () => {
    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={vi.fn()}
        linear
      />,
    );

    expect(screen.getByRole('region', { name: 'Outros' })).toBeInTheDocument();
  });

  it('mostra todos os produtos sem precisar filtrar', () => {
    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={vi.fn()}
        linear
      />,
    );

    expect(
      screen.getByRole('button', { name: /X-Burger/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coca/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suco/ })).toBeInTheDocument();
  });

  it('oferece navegação por categoria', () => {
    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={vi.fn()}
        linear
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Categorias' });
    expect(
      within(nav).getByRole('button', { name: 'Bebidas' }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole('button', { name: 'Lanches' }),
    ).toBeInTheDocument();
  });

  it('rola até a categoria escolhida e a destaca', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={vi.fn()}
        linear
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Categorias' });
    await userEvent.click(within(nav).getByRole('button', { name: 'Lanches' }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(
      within(nav).getByRole('button', { name: 'Lanches' }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('adiciona ao carrinho pelo item da lista', async () => {
    const onSelect = vi.fn();
    render(
      <ProductGrid
        products={linearProducts}
        cart={[]}
        onSelect={onSelect}
        linear
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Coca/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('mostra a quantidade já no carrinho', () => {
    const cart: CartItem[] = [
      {
        cartId: 'a',
        productUid: 'product-2',
        name: 'Coca',
        salePrice: 10,
        costPrice: 1,
        qty: 4,
      },
    ];
    render(
      <ProductGrid
        products={linearProducts}
        cart={cart}
        onSelect={vi.fn()}
        linear
      />,
    );

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('avisa quando não há produtos cadastrados', () => {
    render(<ProductGrid products={[]} cart={[]} onSelect={vi.fn()} linear />);

    expect(screen.getByText('Cadastre produtos primeiro')).toBeInTheDocument();
  });
});
