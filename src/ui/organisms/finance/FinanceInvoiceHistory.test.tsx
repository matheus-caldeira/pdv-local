import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { FinanceInvoiceHistory } from './FinanceInvoiceHistory';
import type { InvoiceHistoryPoint } from '../../../application/finance/invoices.usecases';

afterEach(cleanup);

const POINTS: InvoiceHistoryPoint[] = [
  { month: '2026-05', amount: 100, delta: null },
  { month: '2026-06', amount: 150, delta: 50 },
  { month: '2026-07', amount: 120, delta: -30 },
];

describe('FinanceInvoiceHistory', () => {
  it('renders the empty state', () => {
    render(<FinanceInvoiceHistory points={[]} />);
    expect(
      screen.getByText('Nenhuma fatura registrada ainda.'),
    ).toBeInTheDocument();
  });

  it('renders one row per month with its amount', () => {
    render(<FinanceInvoiceHistory points={POINTS} />);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('R$ 100,00');
    expect(rows[1]).toHaveTextContent('R$ 150,00');
    expect(rows[2]).toHaveTextContent('R$ 120,00');
  });

  it('omits the variation on the first point', () => {
    render(<FinanceInvoiceHistory points={POINTS} />);
    const first = screen.getAllByRole('listitem')[0];
    expect(within(first).queryByText(/Variação/)).toBeNull();
  });

  it('shows a positive variation with the increase tone', () => {
    render(<FinanceInvoiceHistory points={POINTS} />);
    const rise = screen.getAllByRole('listitem')[1];
    const variation = within(rise).getByLabelText(
      'Variação em relação ao mês anterior',
    );
    expect(variation).toHaveTextContent('R$ 50,00');
    expect(variation.className).toContain('text-danger');
  });

  it('shows a negative variation with the decrease tone', () => {
    render(<FinanceInvoiceHistory points={POINTS} />);
    const drop = screen.getAllByRole('listitem')[2];
    const variation = within(drop).getByLabelText(
      'Variação em relação ao mês anterior',
    );
    expect(variation).toHaveTextContent('R$ 30,00');
    expect(variation.className).toContain('text-success');
  });

  it('shows a zero variation as neutral', () => {
    render(
      <FinanceInvoiceHistory
        points={[
          { month: '2026-05', amount: 100, delta: null },
          { month: '2026-06', amount: 100, delta: 0 },
        ]}
      />,
    );
    const stable = screen.getAllByRole('listitem')[1];
    const variation = within(stable).getByLabelText(
      'Variação em relação ao mês anterior',
    );
    expect(variation.className).toContain('text-ink-tertiary');
  });
});
