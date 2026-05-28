import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SalesSummaryCards } from './SalesSummaryCards';

describe('SalesSummaryCards', () => {
  afterEach(cleanup);

  it('renders a card per entry with label and value', () => {
    render(
      <SalesSummaryCards
        cards={[
          { label: 'Vendas', value: 'R$ 10,00', highlight: true },
          { label: 'Pedidos', value: '3' },
        ]}
      />,
    );
    expect(screen.getByText('Vendas')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders an empty grid with no cards', () => {
    const { container } = render(<SalesSummaryCards cards={[]} />);
    expect(container.querySelector('.grid')?.childElementCount).toBe(0);
  });
});
