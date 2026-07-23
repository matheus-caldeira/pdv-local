import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceClosingPreview } from './FinanceClosingPreview';
import type { ClosingPreview } from '../../../application/finance/closing.usecases';
import type { MonthInvoiceLine } from '../../../application/finance/invoices.usecases';
import type {
  FinanceEntry,
  MonthClosing,
} from '../../../domain/finance/finance.entity';

const PENDING_ENTRY: FinanceEntry = {
  id: 1,
  uid: 'entry-1',
  description: 'Conta de luz',
  amount: 180,
  kind: 'expense',
  categoryUid: 'cat-2',
  memberUids: [],
  date: 1780000000000,
  month: '2026-06',
  status: 'pending',
  source: 'manual',
  sourceUid: null,
  installmentNumber: null,
  sourceEntryUids: [],
  formulaBaseMonth: null,
  paymentMethodUid: null,
  invoiceMonth: null,
  invoiceUid: null,
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

const PREVIEW: ClosingPreview = {
  month: '2026-06',
  summary: {
    plannedIncome: 5000,
    plannedExpense: 3200,
    plannedBalance: 1800,
    actualIncome: 4800,
    actualExpense: 3000,
    actualBalance: 1800,
    categories: [
      {
        categoryUid: 'cat-1',
        name: 'Salário',
        kind: 'income',
        budgeted: 2600,
        actual: 2500,
      },
      {
        categoryUid: 'cat-2',
        name: 'Mercado',
        kind: 'expense',
        budgeted: 1200,
        actual: 900,
      },
    ],
  },
  pendingEntries: [PENDING_ENTRY],
  alreadyClosed: false,
};

const CLOSING: MonthClosing = {
  id: 1,
  uid: 'closing-1',
  month: '2026-06',
  closedAt: 1780000000000,
  plannedIncome: 4000,
  plannedExpense: 2500,
  plannedBalance: 1500,
  actualIncome: 4100,
  actualExpense: 2400,
  actualBalance: 1700,
  categories: [
    {
      categoryUid: 'cat-1',
      name: 'Salário',
      kind: 'income',
      budgeted: 3900,
      actual: 4050,
    },
  ],
};

const INVOICES: MonthInvoiceLine[] = [
  {
    uid: 'inv-1',
    paymentMethodUid: 'method-1',
    cardName: 'Cartão Nubank',
    amount: 1200,
    status: 'open',
  },
  {
    uid: 'inv-2',
    paymentMethodUid: 'method-2',
    cardName: 'Cartão Inter',
    amount: 340,
    status: 'paid',
  },
];

function renderPreview(
  overrides: Partial<Parameters<typeof FinanceClosingPreview>[0]> = {},
) {
  const onRequestClose = vi.fn();
  const onRequestReopen = vi.fn();
  render(
    <FinanceClosingPreview
      monthLabel="junho de 2026"
      preview={PREVIEW}
      closing={null}
      invoices={[]}
      isFutureMonth={false}
      onRequestClose={onRequestClose}
      onRequestReopen={onRequestReopen}
      {...overrides}
    />,
  );
  return { onRequestClose, onRequestReopen };
}

describe('FinanceClosingPreview', () => {
  afterEach(cleanup);

  it('renders the summary of an open month with budgeted vs actual amounts', () => {
    renderPreview();
    expect(
      screen.getByRole('heading', { name: 'Fechar junho de 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(screen.getByText('Saídas')).toBeInTheDocument();
    expect(screen.getByText('Saldo')).toBeInTheDocument();
    expect(screen.getByText('R$ 5000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 3000,00')).toBeInTheDocument();
    const categories = screen.getByRole('list', {
      name: 'Detalhe por categoria',
    });
    expect(within(categories).getByText('Salário')).toBeInTheDocument();
    expect(within(categories).getByText('Mercado')).toBeInTheDocument();
  });

  it('warns about pending entries with the post-closing explanation', () => {
    renderPreview();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Lançamentos pendentes em junho de 2026');
    expect(within(alert).getByText('Conta de luz')).toBeInTheDocument();
    expect(within(alert).getByText('R$ 180,00')).toBeInTheDocument();
    expect(alert).toHaveTextContent(
      'Estes lançamentos continuam pendentes e poderão ser pagos depois do fechamento.',
    );
  });

  it('omits the pending warning when there are no pending entries', () => {
    renderPreview({ preview: { ...PREVIEW, pendingEntries: [] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists the invoices due in the month with amount and status', () => {
    renderPreview({ invoices: INVOICES });
    const list = screen.getByRole('list', { name: 'Faturas do mês' });
    expect(within(list).getByText('Cartão Nubank')).toBeInTheDocument();
    expect(within(list).getByText('R$ 1200,00')).toBeInTheDocument();
    expect(within(list).getByText('Pendente')).toBeInTheDocument();
    expect(within(list).getByText('Cartão Inter')).toBeInTheDocument();
    expect(within(list).getByText('R$ 340,00')).toBeInTheDocument();
    expect(within(list).getByText('Paga')).toBeInTheDocument();
  });

  it('omits the invoices block when there are none', () => {
    renderPreview();
    expect(
      screen.queryByRole('list', { name: 'Faturas do mês' }),
    ).not.toBeInTheDocument();
  });

  it('shows the invoices in a closed month snapshot', () => {
    renderPreview({ closing: CLOSING, invoices: INVOICES });
    expect(
      screen.getByRole('list', { name: 'Faturas do mês' }),
    ).toBeInTheDocument();
  });

  it('requests the closing confirmation when clicking the close button', async () => {
    const { onRequestClose } = renderPreview();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar mês' }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('disables the close button with an explanation for future months', () => {
    renderPreview({ isFutureMonth: true });
    expect(screen.getByRole('button', { name: 'Fechar mês' })).toBeDisabled();
    expect(
      screen.getByText(/Não é possível fechar um mês futuro/),
    ).toBeInTheDocument();
  });

  it('renders the frozen snapshot with a reopen button when the month is closed', async () => {
    const { onRequestReopen } = renderPreview({ closing: CLOSING });
    expect(
      screen.getByRole('heading', { name: 'junho de 2026 está fechado' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fechado em/)).toBeInTheDocument();
    expect(screen.getByText('R$ 4100,00')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Fechar mês' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir mês' }));
    expect(onRequestReopen).toHaveBeenCalledTimes(1);
  });
});
