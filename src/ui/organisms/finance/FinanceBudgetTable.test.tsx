import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceBudgetTable } from './FinanceBudgetTable';
import type { BudgetLineView } from '../../../application/finance/budget.usecases';

const INCOME_LINE: BudgetLineView = {
  categoryUid: 'inc-1',
  name: 'Salário',
  kind: 'income',
  amount: 5000,
  fromOverride: false,
  templateAmount: 5000,
  overrideAmount: null,
  actual: 5200,
};

const OVERRIDE_LINE: BudgetLineView = {
  categoryUid: 'exp-1',
  name: 'Mercado',
  kind: 'expense',
  amount: 80,
  fromOverride: true,
  templateAmount: 100,
  overrideAmount: 80,
  actual: 100,
};

const EVEN_LINE: BudgetLineView = {
  categoryUid: 'exp-2',
  name: 'Luz',
  kind: 'expense',
  amount: 30,
  fromOverride: false,
  templateAmount: 30,
  overrideAmount: null,
  actual: 30,
};

const EMPTY_TEMPLATE_LINE: BudgetLineView = {
  categoryUid: 'exp-3',
  name: 'Internet',
  kind: 'expense',
  amount: 0,
  fromOverride: false,
  templateAmount: null,
  overrideAmount: null,
  actual: 12,
};

const ALL_LINES = [INCOME_LINE, OVERRIDE_LINE, EVEN_LINE, EMPTY_TEMPLATE_LINE];

function renderTable(
  overrides: Partial<Parameters<typeof FinanceBudgetTable>[0]> = {},
) {
  const props = {
    lines: ALL_LINES,
    monthLocked: false,
    onSaveTemplate: vi.fn(),
    onSaveOverride: vi.fn(),
    onRemoveOverride: vi.fn(),
    ...overrides,
  };
  render(<FinanceBudgetTable {...props} />);
  return props;
}

describe('FinanceBudgetTable', () => {
  afterEach(cleanup);

  it('groups lines by kind with income first', () => {
    renderTable();
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings[0]).toHaveTextContent('Entradas');
    expect(headings[1]).toHaveTextContent('Saídas');
    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
  });

  it('hides a group without lines', () => {
    renderTable({ lines: [INCOME_LINE] });
    expect(
      screen.getByRole('heading', { name: 'Entradas' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Saídas' }),
    ).not.toBeInTheDocument();
  });

  it('shows the template and effective month amounts in the inputs', () => {
    renderTable();
    expect(screen.getByLabelText('Modelo de Mercado')).toHaveValue(100);
    expect(screen.getByLabelText('Valor de Mercado no mês')).toHaveValue(80);
    expect(screen.getByLabelText('Modelo de Internet')).toHaveValue(null);
  });

  it('marks overridden lines with the badge and the restore action', () => {
    renderTable();
    expect(screen.getByText('Ajustado')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Voltar Luz ao modelo' }),
    ).not.toBeInTheDocument();
  });

  it('shows the difference with the token for each direction', () => {
    renderTable();
    expect(screen.getByText('R$ 200,00')).toHaveClass('text-success');
    expect(screen.getByText('R$ -20,00')).toHaveClass('text-danger');
    expect(screen.getByText('R$ 0,00')).toHaveClass('text-ink-tertiary');
  });

  it('saves the template amount on Enter', async () => {
    const props = renderTable();
    const input = screen.getByLabelText('Modelo de Mercado');
    await userEvent.clear(input);
    await userEvent.type(input, '150{enter}');
    expect(props.onSaveTemplate).toHaveBeenCalledWith('exp-1', 150);
    expect(props.onSaveOverride).not.toHaveBeenCalled();
  });

  it('saves the month amount on blur', async () => {
    const props = renderTable();
    const input = screen.getByLabelText('Valor de Mercado no mês');
    await userEvent.clear(input);
    await userEvent.type(input, '60');
    await userEvent.tab();
    expect(props.onSaveOverride).toHaveBeenCalledWith('exp-1', 60);
    expect(props.onSaveTemplate).not.toHaveBeenCalled();
  });

  it('creates a template amount for a category without one', async () => {
    const props = renderTable();
    const input = screen.getByLabelText('Modelo de Internet');
    await userEvent.type(input, '45{enter}');
    expect(props.onSaveTemplate).toHaveBeenCalledWith('exp-3', 45);
  });

  it('does not save when the value is unchanged', async () => {
    const props = renderTable();
    await userEvent.click(screen.getByLabelText('Valor de Mercado no mês'));
    await userEvent.tab();
    expect(props.onSaveOverride).not.toHaveBeenCalled();
  });

  it('restores the previous value when the input is cleared', async () => {
    const props = renderTable();
    const input = screen.getByLabelText('Valor de Mercado no mês');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue(80);
    expect(props.onSaveOverride).not.toHaveBeenCalled();
  });

  it('requests the override removal with the current month amount', async () => {
    const props = renderTable();
    await userEvent.click(
      screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
    );
    expect(props.onRemoveOverride).toHaveBeenCalledWith('exp-1', 80);
  });

  it('locks month editing and override removal when the month is closed', () => {
    renderTable({ monthLocked: true });
    expect(screen.getByLabelText('Valor de Mercado no mês')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Voltar Mercado ao modelo' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Modelo de Mercado')).toBeEnabled();
  });
});
