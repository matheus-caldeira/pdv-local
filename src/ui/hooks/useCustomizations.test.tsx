import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useCustomizations } from './useCustomizations';
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

const GROUP_INPUT: CustomizationGroupInput = {
  name: 'Extras',
  required: false,
  minQty: 0,
  maxQty: 10,
  chargeAfter: 0,
};

const ITEM_INPUT: CustomizationItemInput = {
  groupId: 1,
  name: 'Bacon',
  price: 3,
  maxQty: 0,
  chargeAfter: 0,
  active: true,
};

function Probe() {
  const { groups, items, saveGroup, removeGroup, saveItem, removeItem } =
    useCustomizations();
  return (
    <div>
      <span>groups:{groups.map((g) => g.name).join(',')}</span>
      <span>items:{items.map((i) => i.name).join(',')}</span>
      <button onClick={() => saveGroup(GROUP_INPUT)}>create-group</button>
      <button onClick={() => saveGroup(GROUP_INPUT, 5)}>update-group</button>
      <button onClick={() => removeGroup(8)}>remove-group</button>
      <button onClick={() => saveItem(ITEM_INPUT)}>create-item</button>
      <button onClick={() => saveItem(ITEM_INPUT, 3)}>update-item</button>
      <button onClick={() => removeItem(4)}>remove-item</button>
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

describe('useCustomizations', () => {
  beforeEach(() => {
    listGroups.mockReset();
    listItems.mockReset();
    createGroup.mockReset();
    updateGroup.mockReset();
    removeGroup.mockReset();
    createItem.mockReset();
    updateItem.mockReset();
    removeItem.mockReset();
    listGroups.mockResolvedValue(right([]));
    listItems.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads groups and items', async () => {
    listGroups.mockResolvedValue(right([{ id: 1, name: 'Extras' }]));
    listItems.mockResolvedValue(right([{ id: 11, groupId: 1, name: 'Bacon' }]));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('groups:Extras')).toBeInTheDocument(),
    );
    expect(screen.getByText('items:Bacon')).toBeInTheDocument();
  });

  it('toasts when loading groups or items fails', async () => {
    listGroups.mockResolvedValue(left(new FakeError('falha grupos')));
    listItems.mockResolvedValue(left(new FakeError('falha itens')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha itens'),
    );
  });

  it('creates and updates a group', async () => {
    createGroup.mockResolvedValue(right({ id: 1, name: 'Extras' }));
    updateGroup.mockResolvedValue(right({ id: 5, name: 'Extras' }));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create-group'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Grupo criado'),
    );
    expect(createGroup).toHaveBeenCalledWith(GROUP_INPUT);
    await userEvent.click(screen.getByText('update-group'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Grupo atualizado'),
    );
    expect(updateGroup).toHaveBeenCalledWith(5, GROUP_INPUT);
  });

  it('toasts when saving a group fails', async () => {
    createGroup.mockResolvedValue(left(new FakeError('grupo invalido')));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create-group'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('grupo invalido'),
    );
  });

  it('removes a group and refreshes, and toasts on failure', async () => {
    removeGroup.mockResolvedValueOnce(right(undefined));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove-group'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Grupo removido'),
    );
    expect(removeGroup).toHaveBeenCalledWith(8);
    removeGroup.mockResolvedValueOnce(left(new FakeError('falha grupo')));
    await userEvent.click(screen.getByText('remove-group'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha grupo'),
    );
  });

  it('creates and updates an item', async () => {
    createItem.mockResolvedValue(right({ id: 1, name: 'Bacon' }));
    updateItem.mockResolvedValue(right({ id: 3, name: 'Bacon' }));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create-item'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Item adicionado'),
    );
    expect(createItem).toHaveBeenCalledWith(ITEM_INPUT);
    await userEvent.click(screen.getByText('update-item'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Item atualizado'),
    );
    expect(updateItem).toHaveBeenCalledWith(3, ITEM_INPUT);
  });

  it('toasts when saving an item fails', async () => {
    createItem.mockResolvedValue(left(new FakeError('item invalido')));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create-item'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('item invalido'),
    );
  });

  it('removes an item and refreshes, and toasts on failure', async () => {
    removeItem.mockResolvedValueOnce(right(undefined));
    renderProbe();
    await waitFor(() => expect(listGroups).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove-item'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Item removido'),
    );
    expect(removeItem).toHaveBeenCalledWith(4);
    removeItem.mockResolvedValueOnce(left(new FakeError('falha item')));
    await userEvent.click(screen.getByText('remove-item'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha item'),
    );
  });
});
