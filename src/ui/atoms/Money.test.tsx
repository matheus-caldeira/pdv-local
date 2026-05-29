import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Money } from './Money';

describe('Money', () => {
  it('renders the formatted value', () => {
    render(<Money value={12.5} />);
    expect(screen.getByText('R$ 12,50')).toBeInTheDocument();
  });

  it('merges a custom class', () => {
    render(<Money value={1} className="text-accent" />);
    expect(screen.getByText('R$ 1,00')).toHaveClass('text-accent');
  });
});
