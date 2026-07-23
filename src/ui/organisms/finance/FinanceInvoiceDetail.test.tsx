import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceInvoiceDetail } from './FinanceInvoiceDetail';
import type { InvoiceDetail } from '../../../application/finance/invoices.usecases';
import type { CardInvoice } from '../../../domain/finance/payment-method.entity';
import type { FinanceEntry } from '../../../domain/finance/finance.entity';

function entry(overrides: Partial<FinanceEntry>): FinanceEntry {
  return {
    id: 1,
    uid: 'e-1',
    description: 'Mercado',
    amount: 100,
    kind: 'expense',
    categoryUid: 'cat-1',
    memberUids: [],
    date: 1700000000000,
    month: '2026-07',
    status: 'pending',
    source: 'manual',
    sourceUid: null,
    installmentNumber: null,
    sourceEntryUids: [],
    formulaBaseMonth: null,
    paymentMethodUid: 'pm-2',
    invoiceMonth: '2026-07',
    invoiceUid: 'inv-1',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  };
}

function invoice(overrides: Partial<CardInvoice>): CardInvoice {
  return {
    id: 1,
    uid: 'inv-1',
    paymentMethodUid: 'pm-2',
    month: '2026-07',
    dueDate: 1721000000000,
    statedAmount: 150,
    status: 'open',
    paidAt: null,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  };
}

const onSetAmount = vi.fn();
const onPay = vi.fn();

function renderDetail(detail: InvoiceDetail) {
  return render(
    <FinanceInvoiceDetail
      detail={detail}
      onSetAmount={onSetAmount}
      onPay={onPay}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const ADJUSTMENT_DETAIL: InvoiceDetail = {
  invoice: invoice({ statedAmount: 150 }),
  entries: [entry({ amount: 100 })],
  detailedTotal: 100,
  reconciliation: { kind: 'adjustment', amount: 50 },
};

describe('FinanceInvoiceDetail', () => {
  it('shows the stated amount, detailed total, adjustment and final total', () => {
    renderDetail(ADJUSTMENT_DETAIL);
    expect(screen.getByLabelText('Valor da fatura')).toHaveValue(150);
    expect(
      screen.getByText('Total detalhado').closest('div'),
    ).toHaveTextContent('R$ 100,00');
    expect(screen.getByText('Ajuste').closest('div')).toHaveTextContent(
      'R$ 50,00',
    );
    expect(screen.getByText('Total final').closest('div')).toHaveTextContent(
      'R$ 150,00',
    );
  });

  it('warns about the divergence when the reconciliation is over', () => {
    renderDetail({
      invoice: invoice({ statedAmount: 80 }),
      entries: [entry({ amount: 100 })],
      detailedTotal: 100,
      reconciliation: { kind: 'over', excess: 20 },
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('R$ 20,00');
    expect(screen.queryByText('Ajuste')).not.toBeInTheDocument();
  });

  it('does not show an adjustment line when balanced', () => {
    renderDetail({
      invoice: invoice({ statedAmount: 100 }),
      entries: [entry({ amount: 100 })],
      detailedTotal: 100,
      reconciliation: { kind: 'balanced' },
    });
    expect(screen.queryByText('Ajuste')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('saves the stated amount', async () => {
    onSetAmount.mockResolvedValue(true);
    renderDetail(ADJUSTMENT_DETAIL);
    const field = screen.getByLabelText('Valor da fatura');
    await userEvent.clear(field);
    await userEvent.type(field, '200');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar valor' }));
    expect(onSetAmount).toHaveBeenCalledWith(200);
  });

  it('pays the invoice through the callback', async () => {
    onPay.mockResolvedValue(true);
    renderDetail(ADJUSTMENT_DETAIL);
    await userEvent.click(screen.getByRole('button', { name: 'Pagar fatura' }));
    expect(onPay).toHaveBeenCalledTimes(1);
  });

  it('disables editing and marks the invoice as paid', () => {
    renderDetail({
      invoice: invoice({
        statedAmount: 150,
        status: 'paid',
        paidAt: 1721000000000,
      }),
      entries: [entry({ amount: 100 })],
      detailedTotal: 100,
      reconciliation: { kind: 'adjustment', amount: 50 },
    });
    expect(screen.getByLabelText('Valor da fatura')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Pagar fatura' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Fatura paga/)).toBeInTheDocument();
  });

  it('renders an empty state when there is no invoice yet', () => {
    renderDetail({
      invoice: null,
      entries: [],
      detailedTotal: 0,
      reconciliation: { kind: 'balanced' },
    });
    expect(screen.getByLabelText('Valor da fatura')).toHaveValue(null);
  });

  it('does not save while the amount field is empty', async () => {
    renderDetail({
      invoice: null,
      entries: [],
      detailedTotal: 0,
      reconciliation: { kind: 'balanced' },
    });
    expect(screen.getByRole('button', { name: 'Salvar valor' })).toBeDisabled();
  });

  it('resets the amount field when a new detail comes in', async () => {
    const view = renderDetail(ADJUSTMENT_DETAIL);
    const field = screen.getByLabelText('Valor da fatura');
    await userEvent.clear(field);
    await userEvent.type(field, '999');
    view.rerender(
      <FinanceInvoiceDetail
        detail={{
          invoice: invoice({ statedAmount: 300 }),
          entries: [entry({ amount: 100 })],
          detailedTotal: 100,
          reconciliation: { kind: 'adjustment', amount: 200 },
        }}
        onSetAmount={onSetAmount}
        onPay={onPay}
      />,
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Valor da fatura')).toHaveValue(300),
    );
  });
});
