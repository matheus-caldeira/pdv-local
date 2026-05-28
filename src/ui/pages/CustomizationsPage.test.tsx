import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomizationsPage } from './CustomizationsPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type {
  CustomizationGroupInput,
  CustomizationItemInput,
} from '../../domain/customization/customization.rules';

const listGroups = vi.fn();
const listItems = vi.fn();
const createGroup = vi.fn();
const updateGroup = vi.fn();
const removeGroup = vi.fn();
const createItem = vi.fn();
const updateItem = vi.fn();
const removeItem = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listGroups: () => listGroups(),
    listItems: () => listItems(),
    createGroup: (input: CustomizationGroupInput) => createGroup(input),
    updateGroup: (id: number, input: CustomizationGroupInput) =>
      updateGroup(id, input),
    removeGroup: (id: number) => removeGroup(id),
    createItem: (input: CustomizationItemInput) => createItem(input),
    updateItem: (id: number, input: CustomizationItemInput) =>
      updateItem(id, input),
    removeItem: (id: number) => removeItem(id),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const adicionais = {
  id: 1,
  name: 'Adicionais',
  required: true,
  minQty: 1,
  maxQty: 3,
  chargeAfter: 2,
};

const molhos = {
  id: 2,
  name: 'Molhos',
  required: false,
  minQty: 0,
  maxQty: 1,
  chargeAfter: 0,
};

const bacon = {
  id: 11,
  groupId: 1,
  name: 'Bacon',
  price: 3,
  maxQty: 2,
  chargeAfter: 1,
  active: true,
};

const cheddar = {
  id: 12,
  groupId: 1,
  name: 'Cheddar',
  price: 0,
  maxQty: 0,
  chargeAfter: 0,
  active: false,
};

function renderPage() {
  return render(
    <ToastProvider>
      <CustomizationsPage />
    </ToastProvider>,
  );
}

describe('CustomizationsPage', () => {
  beforeEach(() => {
    listGroups.mockReset();
    listItems.mockReset();
    createGroup.mockReset();
    updateGroup.mockReset();
    removeGroup.mockReset();
    createItem.mockReset();
    updateItem.mockReset();
    removeItem.mockReset();
    listGroups.mockResolvedValue(right([adicionais, molhos]));
    listItems.mockResolvedValue(right([bacon, cheddar]));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty state when there are no groups', async () => {
    listGroups.mockResolvedValue(right([]));
    listItems.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum grupo criado')).toBeInTheDocument(),
    );
  });

  it('renders group meta tags including required, charge and item count', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    expect(screen.getByText('Obrigatorio')).toBeInTheDocument();
    expect(screen.getByText('Opcional')).toBeInTheDocument();
    expect(screen.getByText('Cobra a partir de 2')).toBeInTheDocument();
    expect(screen.getByText('2 itens')).toBeInTheDocument();
    expect(screen.getByText('0 itens')).toBeInTheDocument();
  });

  it('expands a group to show items and collapses again', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    expect(screen.getByText('Bacon')).toBeInTheDocument();
    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.getByText('max 2')).toBeInTheDocument();
    expect(screen.getByText('cobra +1')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Recolher Adicionais' }),
    );
    expect(screen.queryByText('Bacon')).not.toBeInTheDocument();
  });

  it('shows the empty-items hint for a group with no items', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Molhos')).toBeInTheDocument());
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Molhos' }),
    );
    expect(screen.getByText('Nenhum item neste grupo')).toBeInTheDocument();
  });

  it('creates a group through the modal', async () => {
    createGroup.mockResolvedValue(right({ id: 9 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Novo Grupo/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome do Grupo'), 'Pao');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Obrigatorio?'),
      '1',
    );
    const min = within(dialog).getByLabelText('Minimo');
    await userEvent.clear(min);
    await userEvent.type(min, '1');
    const max = within(dialog).getByLabelText('Maximo');
    await userEvent.clear(max);
    await userEvent.type(max, '2');
    const charge = within(dialog).getByLabelText(
      'Cobrar a partir de (selecoes)',
    );
    await userEvent.clear(charge);
    await userEvent.type(charge, '2');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createGroup).toHaveBeenCalledWith({
      name: 'Pao',
      required: true,
      minQty: 1,
      maxQty: 2,
      chargeAfter: 2,
    });
  });

  it('toasts and keeps the group modal open on Left', async () => {
    createGroup.mockResolvedValue(
      left(new FakeError('Informe o nome do grupo.')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Novo Grupo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Informe o nome do grupo.',
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits a group prefilling the form', async () => {
    updateGroup.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Editar Adicionais' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nome do Grupo')).toHaveValue(
      'Adicionais',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(updateGroup).toHaveBeenCalledWith(1, expect.any(Object)),
    );
  });

  it('removes a group after confirmation and skips when cancelled', async () => {
    removeGroup.mockResolvedValue(right(undefined));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Adicionais' }),
    );
    expect(removeGroup).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Adicionais' }),
    );
    await waitFor(() => expect(removeGroup).toHaveBeenCalledWith(1));
  });

  it('adds an item to a group through the modal', async () => {
    createItem.mockResolvedValue(right({ id: 50 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Item/ }),
    );
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Nome'), 'Ovo');
    const price = within(dialog).getByLabelText('Preco (R$)');
    await userEvent.clear(price);
    await userEvent.type(price, '2');
    const max = within(dialog).getByLabelText('Maximo por item');
    await userEvent.clear(max);
    await userEvent.type(max, '4');
    const charge = within(dialog).getByLabelText(
      'Cobrar a partir de (unidades)',
    );
    await userEvent.clear(charge);
    await userEvent.type(charge, '1');
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), '0');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createItem).toHaveBeenCalledWith({
      groupId: 1,
      name: 'Ovo',
      price: 2,
      maxQty: 4,
      chargeAfter: 1,
      active: false,
    });
  });

  it('toasts and keeps the item modal open on Left', async () => {
    createItem.mockResolvedValue(
      left(new FakeError('Informe o nome do item.')),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Item/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Informe o nome do item.',
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits an item prefilling the form', async () => {
    updateItem.mockResolvedValue(right({ id: 11 }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Editar Bacon' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Bacon');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(updateItem).toHaveBeenCalledWith(11, expect.any(Object)),
    );
  });

  it('removes an item after confirmation and skips when cancelled', async () => {
    removeItem.mockResolvedValue(right(undefined));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Bacon' }),
    );
    expect(removeItem).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Bacon' }),
    );
    await waitFor(() => expect(removeItem).toHaveBeenCalledWith(11));
  });

  it('uses the singular item label when a group has a single item', async () => {
    listItems.mockResolvedValue(right([bacon]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('closes the group modal via the backdrop', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Novo Grupo/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the item modal via the backdrop', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Adicionais')).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Expandir Adicionais' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar Item/ }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
