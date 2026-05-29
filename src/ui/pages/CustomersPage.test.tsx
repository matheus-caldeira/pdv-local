import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersPage } from './CustomersPage';
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

const ana = {
  id: 1,
  name: 'Ana',
  phone: '11912345678',
  addresses: ['Rua A', 'Rua B'],
  createdAt: 0,
  updatedAt: 0,
};

const bruno = {
  id: 2,
  name: 'Bruno',
  phone: '21999990000',
  addresses: ['Av C'],
  createdAt: 0,
  updatedAt: 0,
};

function renderPage() {
  return render(
    <ToastProvider>
      <CustomersPage />
    </ToastProvider>,
  );
}

describe('CustomersPage', () => {
  beforeEach(() => {
    listCustomers.mockReset();
    saveCustomer.mockReset();
    removeCustomer.mockReset();
    listCustomers.mockResolvedValue(right([bruno, ana]));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders sorted customers with address count labels', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    const names = screen.getAllByText(/Ana|Bruno/).map((n) => n.textContent);
    expect(names).toEqual(['Ana', 'Bruno']);
    expect(screen.getByText('2 enderecos')).toBeInTheDocument();
    expect(screen.getByText('1 endereco')).toBeInTheDocument();
  });

  it('shows the empty state when there are no customers', async () => {
    listCustomers.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum cliente cadastrado')).toBeInTheDocument(),
    );
  });

  it('filters by name and by phone', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    const search = screen.getByRole('textbox', { name: 'Buscar clientes' });
    await userEvent.type(search, 'bru');
    expect(screen.getByText('Bruno')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, '1191234');
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bruno')).not.toBeInTheDocument();
  });

  it('opens the new customer modal', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Cliente/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Novo Cliente')).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Excluir' }),
    ).not.toBeInTheDocument();
  });

  it('creates a customer with a managed address list', async () => {
    saveCustomer.mockResolvedValue(right({ id: 99 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Cliente/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Carla');
    await userEvent.type(within(dialog).getByLabelText('Telefone'), '551199');
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Adicionar endereco/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Adicionar endereco/ }),
    );
    await userEvent.type(within(dialog).getByLabelText('Endereco 1'), 'Rua Um');
    await userEvent.type(
      within(dialog).getByLabelText('Endereco 2'),
      'Rua Dois',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover endereco 1' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(saveCustomer).toHaveBeenCalledWith(
      { name: 'Carla', phone: '551199', addresses: ['Rua Dois'] },
      undefined,
    );
  });

  it('edits an existing customer through a row click', async () => {
    saveCustomer.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Ana'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Editar Cliente')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Ana');
    expect(within(dialog).getByLabelText('Endereco 1')).toHaveValue('Rua A');
    await userEvent.clear(within(dialog).getByLabelText('Endereco 2'));
    await userEvent.type(
      within(dialog).getByLabelText('Endereco 2'),
      'Rua Nova',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(saveCustomer).toHaveBeenCalledWith(
      { name: 'Ana', phone: '11912345678', addresses: ['Rua A', 'Rua Nova'] },
      1,
    );
  });

  it('closes the modal via the backdrop', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Cliente/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the modal open and toasts when saving returns Left', async () => {
    saveCustomer.mockResolvedValue(left(new FakeError('Informe o telefone.')));
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Cliente/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Informe o telefone.',
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('removes a customer after confirmation', async () => {
    removeCustomer.mockResolvedValue(right(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Ana'));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(removeCustomer).toHaveBeenCalledWith(1);
  });

  it('does not remove when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Ana'));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(removeCustomer).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the modal open when removal returns Left', async () => {
    removeCustomer.mockResolvedValue(left(new FakeError('falha excluir')));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Ana'));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha excluir'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
