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
import {
  getBusinessType,
  type BusinessTypeDefinition,
} from '../../domain/business-type/registry';
import type { CustomerInput } from '../../domain/customer/customer.rules';

const listCustomers = vi.fn();
const saveCustomer = vi.fn();
const removeCustomer = vi.fn();
const resolveActiveType = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listCustomers: () => listCustomers(),
    saveCustomer: (
      input: CustomerInput,
      definition: BusinessTypeDefinition,
      uid?: string,
    ) => saveCustomer(input, definition, uid),
    removeCustomer: (uid: string) => removeCustomer(uid),
    resolveActiveType: () => resolveActiveType(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const ana = {
  id: 1,
  uid: 'customer-1',
  name: 'Ana',
  phone: '11912345678',
  addresses: ['Rua A', 'Rua B'],
  extra: {},
  createdAt: 0,
  updatedAt: 0,
};

const bruno = {
  id: 2,
  uid: 'customer-2',
  name: 'Bruno',
  phone: '21999990000',
  addresses: ['Av C'],
  extra: {},
  createdAt: 0,
  updatedAt: 0,
};

const carla = {
  id: 3,
  uid: 'customer-3',
  name: 'Carla',
  addresses: [],
  extra: {},
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
    resolveActiveType.mockReset();
    listCustomers.mockResolvedValue(right([bruno, ana]));
    resolveActiveType.mockResolvedValue(right(getBusinessType('quick_sale')));
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
    expect(screen.getByText('2 endereços')).toBeInTheDocument();
    expect(screen.getByText('1 endereço')).toBeInTheDocument();
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

  it('filters out customers without a phone when searching by phone', async () => {
    listCustomers.mockResolvedValue(right([bruno, ana, carla]));
    renderPage();
    await waitFor(() => expect(screen.getByText('Carla')).toBeInTheDocument());
    const search = screen.getByRole('textbox', { name: 'Buscar clientes' });
    await userEvent.type(search, '1191234');
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Carla')).not.toBeInTheDocument();
  });

  it('opens the edit modal with an empty phone for a customer without one', async () => {
    listCustomers.mockResolvedValue(right([bruno, ana, carla]));
    renderPage();
    await waitFor(() => expect(screen.getByText('Carla')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Carla'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Telefone')).toHaveValue('');
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
      within(dialog).getByRole('button', { name: /Adicionar endereço/ }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Adicionar endereço/ }),
    );
    await userEvent.type(within(dialog).getByLabelText('Endereço 1'), 'Rua Um');
    await userEvent.type(
      within(dialog).getByLabelText('Endereço 2'),
      'Rua Dois',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Remover endereço 1' }),
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(saveCustomer).toHaveBeenCalledWith(
      { name: 'Carla', phone: '551199', addresses: ['Rua Dois'], extra: {} },
      getBusinessType('quick_sale'),
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
    expect(within(dialog).getByLabelText('Endereço 1')).toHaveValue('Rua A');
    await userEvent.clear(within(dialog).getByLabelText('Endereço 2'));
    await userEvent.type(
      within(dialog).getByLabelText('Endereço 2'),
      'Rua Nova',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(saveCustomer).toHaveBeenCalledWith(
      {
        name: 'Ana',
        phone: '11912345678',
        addresses: ['Rua A', 'Rua Nova'],
        extra: {},
      },
      getBusinessType('quick_sale'),
      'customer-1',
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
    expect(removeCustomer).toHaveBeenCalledWith('customer-1');
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

  describe('when the active business type is scout', () => {
    beforeEach(() => {
      resolveActiveType.mockResolvedValue(right(getBusinessType('scout')));
    });

    it('shows the scout extra fields in the modal', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
      await userEvent.click(
        screen.getByRole('button', { name: /Novo Cliente/ }),
      );
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText('Seção')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Responsável')).toBeInTheDocument();
    });

    it('saves a customer with the section and guardian extra fields', async () => {
      saveCustomer.mockResolvedValue(right({ id: 99 }));
      renderPage();
      await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
      await userEvent.click(
        screen.getByRole('button', { name: /Novo Cliente/ }),
      );
      const dialog = screen.getByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText('Nome'), 'Carla');
      await userEvent.type(within(dialog).getByLabelText('Telefone'), '551199');
      await userEvent.selectOptions(
        within(dialog).getByLabelText('Seção'),
        'lobinho',
      );
      await userEvent.type(
        within(dialog).getByLabelText('Responsável'),
        'Marta',
      );
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Salvar' }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      expect(saveCustomer).toHaveBeenCalledWith(
        {
          name: 'Carla',
          phone: '551199',
          addresses: [],
          extra: { section: 'lobinho', guardian: 'Marta' },
        },
        getBusinessType('scout'),
        undefined,
      );
    });

    it('preserves orphan extra keys from another business type on save', async () => {
      saveCustomer.mockResolvedValue(right({ id: 1 }));
      const anaWithOrphanExtra = {
        ...ana,
        extra: { legacyKey: 'valor antigo' },
      };
      listCustomers.mockResolvedValue(right([bruno, anaWithOrphanExtra]));
      renderPage();
      await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
      await userEvent.click(screen.getByText('Ana'));
      const dialog = screen.getByRole('dialog');
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Salvar' }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      expect(saveCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          extra: { legacyKey: 'valor antigo' },
        }),
        getBusinessType('scout'),
        'customer-1',
      );
    });
  });
});
