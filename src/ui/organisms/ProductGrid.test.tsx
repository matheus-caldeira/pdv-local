import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from './ProductGrid';
import type { Product } from '../../domain/product/product.entity';
import type { CartItem } from '../hooks/usePdvController';

afterEach(cleanup);

function make(
  partial: Partial<Product> & { id: number; name: string },
): Product {
  return {
    category: 'Lanches',
    costPrice: 1,
    salePrice: 10,
    stock: 5,
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
        productId: 1,
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
});
