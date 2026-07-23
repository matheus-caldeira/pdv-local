import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FinanceInvoicesPage } from './FinanceInvoicesPage';
import type { PaymentMethod } from '../../../domain/finance/payment-method.entity';
import type {
  InvoiceDetail,
  InvoiceHistoryPoint,
} from '../../../application/finance/invoices.usecases';

const setAmount = vi.fn();
const payInvoice = vi.fn();

let paymentMethodsState: {
  loading: boolean;
  creditCards: PaymentMethod[];
};
let cardInvoicesState: {
  detail: InvoiceDetail | null;
  history: InvoiceHistoryPoint[];
};
let lastCardInvoicesArgs: { cardUid: string; month: string };

vi.mock('../../hooks/usePaymentMethods', () => ({
  usePaymentMethods: () => paymentMethodsState,
}));

vi.mock('../../hooks/useCardInvoices', () => ({
  useCardInvoices: (cardUid: string, month: string) => {
    lastCardInvoicesArgs = { cardUid, month };
    return {
      loading: false,
      detail: cardInvoicesState.detail,
      history: cardInvoicesState.history,
      setAmount,
      payInvoice,
    };
  },
}));

function card(overrides: Partial<PaymentMethod>): PaymentMethod {
  return {
    id: 1,
    uid: 'card-1',
    name: 'Nubank',
    type: 'credit',
    closingDay: 10,
    dueDay: 17,
    archived: false,
    createdAt: 1700000000000,
    ...overrides,
  };
}

const DETAIL: InvoiceDetail = {
  invoice: {
    id: 1,
    uid: 'inv-1',
    paymentMethodUid: 'card-1',
    month: '2026-07',
    dueDate: 1780000000000,
    statedAmount: 250,
    status: 'open',
    paidAt: null,
    createdAt: 1780000000000,
    updatedAt: 1780000000000,
  },
  entries: [],
  detailedTotal: 250,
  reconciliation: { kind: 'balanced' },
};

const HISTORY: InvoiceHistoryPoint[] = [
  { month: '2026-06', amount: 200, delta: null },
];

function renderPage(month = '2026-07') {
  return render(
    <MemoryRouter initialEntries={[`/finance/invoices?month=${month}`]}>
      <FinanceInvoicesPage />
    </MemoryRouter>,
  );
}

describe('FinanceInvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paymentMethodsState = { loading: false, creditCards: [card({})] };
    cardInvoicesState = { detail: DETAIL, history: HISTORY };
  });
  afterEach(cleanup);

  it('shows the loading state while fetching the payment methods', () => {
    paymentMethodsState = { loading: true, creditCards: [] };
    renderPage();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows the empty state pointing to the settings when there are no cards', () => {
    paymentMethodsState = { loading: false, creditCards: [] };
    renderPage();
    expect(
      screen.getByText('Nenhum cartão de crédito cadastrado'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'configurações do financeiro' }),
    ).toHaveAttribute('href', '/finance/settings');
  });

  it('renders the selector, invoice detail and history for the first card', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Faturas' }),
    ).toBeInTheDocument();
    const selector = screen.getByLabelText('Cartão');
    expect(selector).toHaveValue('card-1');
    expect(
      screen.getByRole('region', { name: 'Conciliação da fatura' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Histórico de faturas' }),
    ).toBeInTheDocument();
    expect(lastCardInvoicesArgs).toEqual({
      cardUid: 'card-1',
      month: '2026-07',
    });
  });

  it('lets the user switch the selected card', async () => {
    paymentMethodsState = {
      loading: false,
      creditCards: [card({}), card({ uid: 'card-2', name: 'Inter' })],
    };
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText('Cartão'), 'card-2');
    expect(lastCardInvoicesArgs.cardUid).toBe('card-2');
  });

  it('changes the month through the month picker', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(lastCardInvoicesArgs.month).toBe('2026-06');
  });

  it('pays the invoice with the current timestamp', async () => {
    payInvoice.mockResolvedValue(true);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Pagar fatura' }));
    expect(payInvoice).toHaveBeenCalledWith(expect.any(Number));
  });

  it('saves the invoice amount through the detail form', async () => {
    setAmount.mockResolvedValue(true);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar valor' }));
    expect(setAmount).toHaveBeenCalledWith(250);
  });

  it('renders the selector without the detail when there is no invoice detail', () => {
    cardInvoicesState = { detail: null, history: HISTORY };
    renderPage();
    expect(screen.getByLabelText('Cartão')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Conciliação da fatura' }),
    ).not.toBeInTheDocument();
  });
});
