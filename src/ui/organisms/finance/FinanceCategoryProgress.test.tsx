import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinanceCategoryProgress } from './FinanceCategoryProgress';
import type { CategorySummaryLine } from '../../../domain/finance/finance.rules';

function line(overrides: Partial<CategorySummaryLine>): CategorySummaryLine {
  return {
    categoryUid: 'cat-1',
    name: 'Mercado',
    kind: 'expense',
    budgeted: 100,
    actual: 50,
    ...overrides,
  };
}

describe('FinanceCategoryProgress', () => {
  afterEach(cleanup);

  it('renders nothing when every line has zero budget and zero actual', () => {
    const { container } = render(
      <FinanceCategoryProgress
        categories={[line({ budgeted: 0, actual: 0 })]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('hides zeroed lines while keeping the others', () => {
    render(
      <FinanceCategoryProgress
        categories={[
          line({ categoryUid: 'cat-1', name: 'Mercado' }),
          line({ categoryUid: 'cat-2', name: 'Lazer', budgeted: 0, actual: 0 }),
        ]}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Mercado' })).toBeVisible();
    expect(
      screen.queryByRole('progressbar', { name: 'Lazer' }),
    ).not.toBeInTheDocument();
  });

  it('renders an expense within budget with the accent fill', () => {
    render(
      <FinanceCategoryProgress
        categories={[line({ budgeted: 200, actual: 50 })]}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Mercado' });
    expect(bar).toHaveAttribute('aria-valuenow', '25');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain('bg-accent');
    expect(fill.style.width).toBe('25%');
  });

  it('overflows an expense over budget with the danger fill capped at 100%', () => {
    render(
      <FinanceCategoryProgress
        categories={[line({ budgeted: 100, actual: 150 })]}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Mercado' });
    expect(bar).toHaveAttribute('aria-valuenow', '150');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain('bg-danger');
    expect(fill.style.width).toBe('100%');
  });

  it('treats spending without budget as fully consumed and over budget', () => {
    render(
      <FinanceCategoryProgress
        categories={[line({ budgeted: 0, actual: 80 })]}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Mercado' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain('bg-danger');
  });

  it('renders income lines with the success fill even above budget', () => {
    render(
      <FinanceCategoryProgress
        categories={[
          line({
            name: 'Salário',
            kind: 'income',
            budgeted: 1000,
            actual: 1200,
          }),
        ]}
      />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Salário' });
    expect(bar).toHaveAttribute('aria-valuenow', '120');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.className).toContain('bg-success');
    expect(fill.style.width).toBe('100%');
  });

  it('shows the actual and budgeted amounts of each line', () => {
    render(
      <FinanceCategoryProgress
        categories={[line({ budgeted: 300.5, actual: 120.25 })]}
      />,
    );
    expect(screen.getByText('R$ 120,25')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,50')).toBeInTheDocument();
  });
});
