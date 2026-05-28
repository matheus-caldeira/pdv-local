import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProductRankingList } from './ProductRankingList';

describe('ProductRankingList', () => {
  afterEach(cleanup);

  it('renders the empty label when there are no products', () => {
    render(<ProductRankingList products={[]} emptyLabel="Nada aqui" />);
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('renders ranked products with position, qty and total', () => {
    render(
      <ProductRankingList
        products={[
          { name: 'Burger', qty: 4, total: 40, cost: 10 },
          { name: 'Fries', qty: 2, total: 12, cost: 3 },
        ]}
        emptyLabel="Nada aqui"
      />,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('4x')).toBeInTheDocument();
    expect(screen.getByText('R$ 40,00')).toBeInTheDocument();
    expect(screen.getByText('Fries')).toBeInTheDocument();
    expect(screen.getByText('2x')).toBeInTheDocument();
  });
});
