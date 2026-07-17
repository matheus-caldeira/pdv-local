import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceMemberManager } from './FinanceMemberManager';
import type { FamilyMember } from '../../../domain/finance/finance.entity';

const onCreate = vi.fn();
const onRename = vi.fn();
const onArchive = vi.fn();
const onDelete = vi.fn();

function member(overrides: Partial<FamilyMember>): FamilyMember {
  return {
    id: 1,
    uid: 'member-1',
    name: 'Ana',
    archived: false,
    createdAt: 1700000000000,
    ...overrides,
  };
}

const ANA = member({ uid: 'member-1', name: 'Ana' });
const AVO = member({ uid: 'member-2', name: 'Vô', archived: true });

function renderManager(members: FamilyMember[]) {
  return render(
    <FinanceMemberManager
      members={members}
      onCreate={onCreate}
      onRename={onRename}
      onArchive={onArchive}
      onDelete={onDelete}
    />,
  );
}

describe('FinanceMemberManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the empty state when there are no active members', () => {
    renderManager([]);
    expect(screen.getByText('Nenhum membro ativo.')).toBeInTheDocument();
  });

  it('lists active members', () => {
    renderManager([ANA]);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('arquivado')).not.toBeInTheDocument();
  });

  it('disables the create button while the name is empty', () => {
    renderManager([]);
    expect(
      screen.getByRole('button', { name: /Adicionar membro/ }),
    ).toBeDisabled();
  });

  it('creates a member and clears the input on success', async () => {
    onCreate.mockResolvedValue(true);
    renderManager([]);
    await userEvent.type(screen.getByLabelText('Nome do membro'), 'Maria');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar membro/ }),
    );
    expect(onCreate).toHaveBeenCalledWith('Maria');
    await waitFor(() =>
      expect(screen.getByLabelText('Nome do membro')).toHaveValue(''),
    );
  });

  it('keeps the input when creating fails', async () => {
    onCreate.mockResolvedValue(false);
    renderManager([]);
    await userEvent.type(screen.getByLabelText('Nome do membro'), 'Maria');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar membro/ }),
    );
    expect(screen.getByLabelText('Nome do membro')).toHaveValue('Maria');
  });

  it('archives an active member', async () => {
    onArchive.mockResolvedValue(true);
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Arquivar Ana' }));
    expect(onArchive).toHaveBeenCalledWith('member-1', true);
  });

  it('hides archived members until the toggle is used', async () => {
    renderManager([ANA, AVO]);
    expect(screen.queryByText('Vô')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar arquivados (1)' }),
    );
    expect(screen.getByText('Vô')).toBeInTheDocument();
    expect(screen.getByText('arquivado')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar arquivados' }),
    );
    expect(screen.queryByText('Vô')).not.toBeInTheDocument();
  });

  it('unarchives an archived member', async () => {
    onArchive.mockResolvedValue(true);
    renderManager([AVO]);
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar arquivados (1)' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Desarquivar Vô' }),
    );
    expect(onArchive).toHaveBeenCalledWith('member-2', false);
  });

  it('keeps the archive action available next to delete', () => {
    renderManager([ANA]);
    expect(
      screen.getByRole('button', { name: 'Arquivar Ana' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Excluir Ana' }),
    ).toBeInTheDocument();
  });

  it('deletes a member after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    onDelete.mockResolvedValue(true);
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Ana' }));
    expect(window.confirm).toHaveBeenCalledWith('Excluir o membro "Ana"?');
    expect(onDelete).toHaveBeenCalledWith('member-1');
  });

  it('does not delete when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Ana' }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renames a member through the modal and closes it on success', async () => {
    onRename.mockResolvedValue(true);
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Ana' }));
    const dialog = screen.getByRole('dialog');
    const input = within(dialog).getByLabelText('Nome');
    expect(input).toHaveValue('Ana');
    await userEvent.clear(input);
    await userEvent.type(input, 'Ana Clara');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    expect(onRename).toHaveBeenCalledWith('member-1', 'Ana Clara');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('keeps the rename modal open when renaming fails', async () => {
    onRename.mockResolvedValue(false);
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onRename).toHaveBeenCalledWith('member-1', 'Ana');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables saving the rename while the name is empty', async () => {
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Ana' }));
    await userEvent.clear(screen.getByLabelText('Nome'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('closes the rename modal via the backdrop without renaming', async () => {
    renderManager([ANA]);
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Ana' }));
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onRename).not.toHaveBeenCalled();
  });
});
