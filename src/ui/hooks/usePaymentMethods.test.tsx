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
import type { PaymentMethod } from '../../domain/finance/payment-method.entity';
import type { PaymentMethodInput } from '../../application/finance/payment-methods.usecases';
import { usePaymentMethods } from './usePaymentMethods';

const listPaymentMethods = vi.fn();
const createPaymentMethod = vi.fn();
const updatePaymentMethod = vi.fn();
const archivePaymentMethod = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listPaymentMethods: () => listPaymentMethods(),
    createPaymentMethod: (input: unknown) => createPaymentMethod(input),
    updatePaymentMethod: (uid: string, input: unknown) =>
      updatePaymentMethod(uid, input),
    archivePaymentMethod: (uid: string) => archivePaymentMethod(uid),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function makeMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 1,
    uid: 'method-1',
    name: 'Dinheiro',
    type: 'cash',
    closingDay: null,
    dueDay: null,
    archived: false,
    createdAt: 1,
    ...overrides,
  };
}

const CREDIT_CARD = makeMethod({
  uid: 'card-1',
  name: 'Nubank',
  type: 'credit',
  closingDay: 3,
  dueDay: 10,
});

const ARCHIVED_CARD = makeMethod({
  uid: 'card-2',
  name: 'Cartão antigo',
  type: 'credit',
  closingDay: 5,
  dueDay: 12,
  archived: true,
});

const INPUT: PaymentMethodInput = {
  name: 'Nubank',
  type: 'credit',
  closingDay: 3,
  dueDay: 10,
};

function Wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderPaymentMethods() {
  return renderHook(() => usePaymentMethods(), { wrapper: Wrapper });
}

describe('usePaymentMethods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPaymentMethods.mockResolvedValue(
      right([makeMethod(), CREDIT_CARD, ARCHIVED_CARD]),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('loads methods on mount and derives active credit cards', async () => {
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.methods).toHaveLength(3);
    expect(result.current.creditCards.map((card) => card.uid)).toEqual([
      'card-1',
    ]);
  });

  it('shows a toast and keeps an empty state when loading fails', async () => {
    listPaymentMethods.mockResolvedValue(left(new FakeError('falha meios')));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(screen.getByRole('status')).toHaveTextContent('falha meios');
    expect(result.current.methods).toEqual([]);
    expect(result.current.creditCards).toEqual([]);
  });

  it('creates a method, reloads and toasts on success', async () => {
    createPaymentMethod.mockResolvedValue(right(CREDIT_CARD));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    listPaymentMethods.mockClear();
    let ok = false;
    await act(async () => {
      ok = await result.current.createMethod(INPUT);
    });
    expect(ok).toBe(true);
    expect(createPaymentMethod).toHaveBeenCalledWith(INPUT);
    expect(listPaymentMethods).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Meio de pagamento criado',
    );
  });

  it('returns false and toasts the error when creating fails', async () => {
    createPaymentMethod.mockResolvedValue(left(new FakeError('dia inválido')));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.createMethod(INPUT);
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('dia inválido');
  });

  it('updates a method and toasts on success', async () => {
    updatePaymentMethod.mockResolvedValue(right(CREDIT_CARD));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.updateMethod('card-1', INPUT);
    });
    expect(ok).toBe(true);
    expect(updatePaymentMethod).toHaveBeenCalledWith('card-1', INPUT);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Meio de pagamento atualizado',
    );
  });

  it('returns false and toasts the error when updating fails', async () => {
    updatePaymentMethod.mockResolvedValue(
      left(new FakeError('não encontrado')),
    );
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.updateMethod('card-1', INPUT);
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('não encontrado');
  });

  it('archives a method and toasts on success', async () => {
    archivePaymentMethod.mockResolvedValue(right(undefined));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = false;
    await act(async () => {
      ok = await result.current.archiveMethod('card-1');
    });
    expect(ok).toBe(true);
    expect(archivePaymentMethod).toHaveBeenCalledWith('card-1');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Meio de pagamento removido',
    );
  });

  it('returns false and toasts the error when archiving fails', async () => {
    archivePaymentMethod.mockResolvedValue(left(new FakeError('em uso')));
    const { result } = renderPaymentMethods();
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.archiveMethod('card-1');
    });
    expect(ok).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('em uso');
  });
});
