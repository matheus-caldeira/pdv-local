import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceCategoryManager } from './FinanceCategoryManager';
import type { FinanceCategory } from '../../../domain/finance/finance.entity';

const onCreate = vi.fn();
const onRename = vi.fn();
const onArchive = vi.fn();
const onDelete = vi.fn();

function category(overrides: Partial<FinanceCategory>): FinanceCategory {
  return {
    id: 1,
    uid: 'cat-1',
    name: 'Mercado',
    kind: 'expense',
    archived: false,
    createdAt: 1700000000000,
    ...overrides,
  };
}

const MERCADO = category({ uid: 'cat-1', name: 'Mercado' });
const SALARIO = category({ uid: 'cat-2', name: 'Salário', kind: 'income' });
const ANTIGA = category({ uid: 'cat-3', name: 'Antiga', archived: true });

function renderManager(categories: FinanceCategory[]) {
  return render(
    <FinanceCategoryManager
      categories={categories}
      onCreate={onCreate}
      onRename={onRename}
      onArchive={onArchive}
      onDelete={onDelete}
    />,
  );
}

describe('FinanceCategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty state when there are no active categories', () => {
    renderManager([]);
    expect(screen.getByText('Nenhuma categoria ativa.')).toBeInTheDocument();
  });

  it('groups active categories by kind', () => {
    renderManager([MERCADO, SALARIO]);
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(screen.getByText('Saídas')).toBeInTheDocument();
    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
  });

  it('hides a kind group without active categories', () => {
    renderManager([MERCADO]);
    expect(screen.queryByText('Entradas')).not.toBeInTheDocument();
    expect(screen.getByText('Saídas')).toBeInTheDocument();
  });

  it('disables the create button while the name is empty', () => {
    renderManager([]);
    expect(
      screen.getByRole('button', { name: /Adicionar categoria/ }),
    ).toBeDisabled();
  });

  it('creates a category with the selected kind and clears the input on success', async () => {
    onCreate.mockResolvedValue(true);
    renderManager([]);
    await userEvent.type(
      screen.getByLabelText('Nome da categoria'),
      'Presentes',
    );
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'income');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar categoria/ }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Presentes',
      kind: 'income',
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Nome da categoria')).toHaveValue(''),
    );
  });

  it('keeps the input when creating fails', async () => {
    onCreate.mockResolvedValue(false);
    renderManager([]);
    await userEvent.type(screen.getByLabelText('Nome da categoria'), 'Pets');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar categoria/ }),
    );
    expect(onCreate).toHaveBeenCalledWith({ name: 'Pets', kind: 'expense' });
    expect(screen.getByLabelText('Nome da categoria')).toHaveValue('Pets');
  });

  it('archives an active category', async () => {
    onArchive.mockResolvedValue(true);
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Arquivar Mercado' }),
    );
    expect(onArchive).toHaveBeenCalledWith('cat-1', true);
  });

  it('hides archived categories until the toggle is used', async () => {
    renderManager([MERCADO, ANTIGA]);
    expect(screen.queryByText('Antiga')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar arquivadas (1)' }),
    );
    const row = screen.getByText('Antiga').closest('li') as HTMLElement;
    expect(within(row).getByText('arquivada')).toBeInTheDocument();
    expect(within(row).getByText('Saída')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar arquivadas' }),
    );
    expect(screen.queryByText('Antiga')).not.toBeInTheDocument();
  });

  it('unarchives an archived category', async () => {
    onArchive.mockResolvedValue(true);
    renderManager([ANTIGA]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar arquivadas (1)' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Desarquivar Antiga' }),
    );
    expect(onArchive).toHaveBeenCalledWith('cat-3', false);
  });

  it('keeps the archive action available next to delete', () => {
    renderManager([MERCADO]);
    expect(
      screen.getByRole('button', { name: 'Arquivar Mercado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir Mercado' }),
    ).toBeInTheDocument();
  });

  it('deletes a category after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    onDelete.mockResolvedValue(true);
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir Mercado' }),
    );
    expect(window.confirm).toHaveBeenCalledWith(
      'Excluir a categoria "Mercado"?',
    );
    expect(onDelete).toHaveBeenCalledWith('cat-1');
  });

  it('does not delete when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir Mercado' }),
    );
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renames a category through the modal and closes it on success', async () => {
    onRename.mockResolvedValue(true);
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Renomear Mercado' }),
    );
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Nome');
    expect(input).toHaveValue('Mercado');
    await userEvent.clear(input);
    await userEvent.type(input, 'Feira');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(onRename).toHaveBeenCalledWith('cat-1', 'Feira');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the rename modal open when renaming fails', async () => {
    onRename.mockResolvedValue(false);
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Renomear Mercado' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onRename).toHaveBeenCalledWith('cat-1', 'Mercado');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables saving the rename while the name is empty', async () => {
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Renomear Mercado' }),
    );
    await userEvent.clear(screen.getByLabelText('Nome'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('closes the rename modal via the backdrop without renaming', async () => {
    renderManager([MERCADO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Renomear Mercado' }),
    );
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onRename).not.toHaveBeenCalled();
  });
});
