import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCustomers } from './useCustomers';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { CustomerInput } from '../../domain/customer/customer.rules';

const listCustomers = vi.fn();
const saveCustomer = vi.fn();
const removeCustomer = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listCustomers: () => listCustomers(),
    saveCustomer: (input: CustomerInput, id?: number) =>
      saveCustomer(input, id),
    removeCustomer: (id: number) => removeCustomer(id),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const INPUT: CustomerInput = {
  name: 'Ana',
  phone: '1199',
  addresses: ['Rua A'],
};

function Probe() {
  const { customers, saveCustomer, removeCustomer } = useCustomers();
  return (
    <div>
      <span>customers:{customers.map((c) => c.name).join(',')}</span>
      <button onClick={() => saveCustomer(INPUT)}>create</button>
      <button onClick={() => saveCustomer(INPUT, 7)}>update</button>
      <button onClick={() => removeCustomer(9)}>remove</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ToastProvider>
      <Probe />
    </ToastProvider>,
  );
}

describe('useCustomers', () => {
  beforeEach(() => {
    listCustomers.mockReset();
    saveCustomer.mockReset();
    removeCustomer.mockReset();
    listCustomers.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads and sorts customers by name', async () => {
    listCustomers.mockResolvedValue(
      right([
        { id: 1, name: 'Zelia' },
        { id: 2, name: 'Ana' },
      ]),
    );
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('customers:Ana,Zelia')).toBeInTheDocument(),
    );
  });

  it('toasts when loading fails', async () => {
    listCustomers.mockResolvedValue(left(new FakeError('falha lista')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha lista'),
    );
  });

  it('creates a customer and refreshes', async () => {
    saveCustomer.mockResolvedValue(right({ id: 1, name: 'Ana' }));
    renderProbe();
    await waitFor(() => expect(listCustomers).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Cliente salvo'),
    );
    expect(saveCustomer).toHaveBeenCalledWith(INPUT, undefined);
    expect(listCustomers).toHaveBeenCalledTimes(2);
  });

  it('updates a customer', async () => {
    saveCustomer.mockResolvedValue(right({ id: 7, name: 'Ana' }));
    renderProbe();
    await waitFor(() => expect(listCustomers).toHaveBeenCalled());
    await userEvent.click(screen.getByText('update'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Cliente salvo'),
    );
    expect(saveCustomer).toHaveBeenCalledWith(INPUT, 7);
  });

  it('toasts and returns false when saving fails', async () => {
    saveCustomer.mockResolvedValue(left(new FakeError('telefone duplicado')));
    renderProbe();
    await waitFor(() => expect(listCustomers).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'telefone duplicado',
      ),
    );
    expect(listCustomers).toHaveBeenCalledTimes(1);
  });

  it('removes a customer and refreshes', async () => {
    removeCustomer.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listCustomers).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Cliente excluido'),
    );
    expect(removeCustomer).toHaveBeenCalledWith(9);
    expect(listCustomers).toHaveBeenCalledTimes(2);
  });

  it('toasts when removing fails', async () => {
    removeCustomer.mockResolvedValue(left(new FakeError('falha remover')));
    renderProbe();
    await waitFor(() => expect(listCustomers).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha remover'),
    );
    expect(listCustomers).toHaveBeenCalledTimes(1);
  });
});
