import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type {
  InvoiceDetail,
  InvoiceHistoryPoint,
} from '../../application/finance/invoices.usecases';
import { useCardInvoices } from './useCardInvoices';

const getInvoiceDetail = vi.fn();
const listInvoiceHistory = vi.fn();
const setInvoiceAmount = vi.fn();
const payInvoice = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    getInvoiceDetail: (cardUid: string, month: string) =>
      getInvoiceDetail(cardUid, month),
    listInvoiceHistory: (cardUid: string, months: number) =>
      listInvoiceHistory(cardUid, months),
    setInvoiceAmount: (cardUid: string, month: string, amount: number) =>
      setInvoiceAmount(cardUid, month, amount),
    payInvoice: (cardUid: string, month: string, paidAt: number) =>
      payInvoice(cardUid, month, paidAt),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const DETAIL: InvoiceDetail = {
  invoice: null,
  entries: [],
  detailedTotal: 0,
  reconciliation: { kind: 'balanced' },
};

const HISTORY: InvoiceHistoryPoint[] = [
  { month: '2026-07', amount: 100, delta: null },
];

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderCardInvoices(cardUid = 'card-1', month = '2026-07') {
  return renderHook(() => useCardInvoices(cardUid, month), {
    wrapper: Wrapper,
  });
}

describe('useCardInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvoiceDetail.mockResolvedValue(right(DETAIL));
    listInvoiceHistory.mockResolvedValue(right(HISTORY));
  });

  afterEach(() => {
    cleanup();
  });

  it('loads detail and history on mount for a selected card', async () => {
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getInvoiceDetail).toHaveBeenCalledWith('card-1', '2026-07');
    expect(result.current.detail).toEqual(DETAIL);
    expect(result.current.history).toEqual(HISTORY);
  });

  it('does not fetch when no card is selected', async () => {
    const { result } = renderCardInvoices('');
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getInvoiceDetail).not.toHaveBeenCalled();
    expect(listInvoiceHistory).not.toHaveBeenCalled();
    expect(result.current.detail).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('shows a toast and keeps an empty state when loading fails', async () => {
    getInvoiceDetail.mockResolvedValue(left(new FakeError('falha detalhe')));
    listInvoiceHistory.mockResolvedValue(
      left(new FakeError('falha histórico')),
    );
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(screen.getByRole('status').textContent).toContain('falha');
    expect(result.current.detail).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('sets the invoice amount, reloads and toasts on success', async () => {
    setInvoiceAmount.mockResolvedValue(right(DETAIL.invoice));
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    getInvoiceDetail.mockClear();
    listInvoiceHistory.mockClear();
    let ok = false;
    await act(async () => {
      ok = await result.current.setAmount(200);
    });
    expect(ok).toBe(true);
    expect(setInvoiceAmount).toHaveBeenCalledWith('card-1', '2026-07', 200);
    expect(getInvoiceDetail).toHaveBeenCalled();
    expect(listInvoiceHistory).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Valor da fatura');
  });

  it('returns false and toasts the error when setting the amount fails', async () => {
    setInvoiceAmount.mockResolvedValue(left(new FakeError('fatura paga')));
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.setAmount(200);
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('fatura paga');
  });

  it('pays the invoice, reloads and toasts on success', async () => {
    payInvoice.mockResolvedValue(right(DETAIL.invoice));
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.payInvoice(1234);
    });
    expect(ok).toBe(true);
    expect(payInvoice).toHaveBeenCalledWith('card-1', '2026-07', 1234);
    expect(screen.getByRole('status')).toHaveTextContent('Fatura paga');
  });

  it('returns false and toasts the error when paying fails', async () => {
    payInvoice.mockResolvedValue(left(new FakeError('sem fatura')));
    const { result } = renderCardInvoices();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.payInvoice(1234);
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('sem fatura');
  });
});
