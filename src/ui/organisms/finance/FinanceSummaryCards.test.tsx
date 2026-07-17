import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FinanceSummaryCards } from './FinanceSummaryCards';
import type { MonthSummary } from '../../../domain/finance/finance.rules';

const SUMMARY: MonthSummary = {
  plannedIncome: 5000,
  plannedExpense: 3200.5,
  plannedBalance: 1799.5,
  actualIncome: 4800,
  actualExpense: 2100.25,
  actualBalance: 2699.75,
  categories: [],
};

describe('FinanceSummaryCards', () => {
  afterEach(cleanup);

  it('renders the current balance and the month totals', () => {
    render(<FinanceSummaryCards currentBalance={1234.56} summary={SUMMARY} />);
    expect(screen.getByText('Saldo atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 1234,56')).toBeInTheDocument();
    expect(screen.getByText('Entradas do mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 4800,00')).toBeInTheDocument();
    expect(screen.getByText('Saídas do mês')).toBeInTheDocument();
    expect(screen.getByText('R$ 2100,25')).toBeInTheDocument();
  });

  it('renders the budgeted totals of the month', () => {
    render(<FinanceSummaryCards currentBalance={0} summary={SUMMARY} />);
    expect(screen.getByText('R$ 5000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3200,50')).toBeInTheDocument();
    expect(screen.getAllByText(/Orçado:/)).toHaveLength(2);
  });
});
