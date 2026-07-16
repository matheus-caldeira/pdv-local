import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinanceProjectionChart } from './FinanceProjectionChart';
import type { ProjectionPoint } from '../../../domain/finance/finance.rules';

function point(
  month: string,
  balance: number,
  overrides: Partial<ProjectionPoint> = {},
): ProjectionPoint {
  return {
    month,
    plannedIncome: 0,
    plannedExpense: 0,
    delta: 0,
    balance,
    ...overrides,
  };
}

describe('FinanceProjectionChart', () => {
  afterEach(cleanup);

  it('renders nothing without points', () => {
    const { container } = render(<FinanceProjectionChart points={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('exposes a descriptive image label with month and balance', () => {
    render(
      <FinanceProjectionChart
        points={[point('2026-07', 500), point('2026-08', -120.5)]}
      />,
    );
    const chart = screen.getByRole('img');
    expect(chart).toHaveAttribute(
      'aria-label',
      'Gráfico do saldo projetado por mês. jul/26: R$ 500,00; ago/26: R$ -120,50.',
    );
  });

  it('paints positive balances with the success token and negatives with danger', () => {
    const { container } = render(
      <FinanceProjectionChart
        points={[point('2026-07', 800), point('2026-08', -300)]}
      />,
    );
    expect(container.querySelectorAll('path.fill-success')).toHaveLength(1);
    expect(container.querySelectorAll('path.fill-danger')).toHaveLength(1);
  });

  it('renders a neutral tick for zero balances', () => {
    const { container } = render(
      <FinanceProjectionChart
        points={[point('2026-07', 0), point('2026-08', 0)]}
      />,
    );
    expect(container.querySelectorAll('rect.fill-ink-muted')).toHaveLength(2);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('renders month labels for every point', () => {
    render(
      <FinanceProjectionChart
        points={[
          point('2026-07', 100),
          point('2026-08', 200),
          point('2026-09', 300),
        ]}
      />,
    );
    expect(screen.getByText('jul/26')).toBeInTheDocument();
    expect(screen.getByText('ago/26')).toBeInTheDocument();
    expect(screen.getByText('set/26')).toBeInTheDocument();
  });

  it('formats year boundaries in short portuguese form', () => {
    render(
      <FinanceProjectionChart
        points={[point('2026-01', 100), point('2027-12', 200)]}
      />,
    );
    expect(screen.getByText('jan/26')).toBeInTheDocument();
    expect(screen.getByText('dez/27')).toBeInTheDocument();
  });

  it('keeps tiny bars valid by clamping the rounded corner radius', () => {
    const { container } = render(
      <FinanceProjectionChart
        points={[point('2026-07', 1000), point('2026-08', 1)]}
      />,
    );
    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(2);
    paths.forEach((path) => {
      expect(path.getAttribute('d')).not.toContain('NaN');
    });
  });

  it('renders an all-negative series below the baseline', () => {
    const { container } = render(
      <FinanceProjectionChart
        points={[point('2026-07', -50), point('2026-08', -900)]}
      />,
    );
    expect(container.querySelectorAll('path.fill-danger')).toHaveLength(2);
    expect(container.querySelector('line')).toBeInTheDocument();
  });
});
