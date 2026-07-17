import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFinanceSettings } from './useFinanceSettings';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { FinanceKind } from '../../domain/finance/finance.entity';

const listFinanceCategories = vi.fn();
const listFinanceMembers = vi.fn();
const createFinanceCategory = vi.fn();
const updateFinanceCategory = vi.fn();
const deleteFinanceCategory = vi.fn();
const createFinanceMember = vi.fn();
const updateFinanceMember = vi.fn();
const deleteFinanceMember = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listFinanceCategories: () => listFinanceCategories(),
    listFinanceMembers: () => listFinanceMembers(),
    createFinanceCategory: (input: { name: string; kind: FinanceKind }) =>
      createFinanceCategory(input),
    updateFinanceCategory: (uid: string, changes: unknown) =>
      updateFinanceCategory(uid, changes),
    deleteFinanceCategory: (uid: string) => deleteFinanceCategory(uid),
    createFinanceMember: (name: string) => createFinanceMember(name),
    updateFinanceMember: (uid: string, changes: unknown) =>
      updateFinanceMember(uid, changes),
    deleteFinanceMember: (uid: string) => deleteFinanceMember(uid),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

function Probe() {
  const {
    categories,
    members,
    loading,
    createCategory,
    renameCategory,
    setCategoryArchived,
    deleteCategory,
    createMember,
    renameMember,
    setMemberArchived,
    deleteMember,
  } = useFinanceSettings();
  return (
    <div>
      <span>loading:{String(loading)}</span>
      <span>categories:{categories.map((c) => c.name).join(',')}</span>
      <span>members:{members.map((m) => m.name).join(',')}</span>
      <button onClick={() => createCategory({ name: 'Pets', kind: 'expense' })}>
        create-category
      </button>
      <button onClick={() => renameCategory('cat-1', 'Feira')}>
        rename-category
      </button>
      <button onClick={() => setCategoryArchived('cat-1', true)}>
        archive-category
      </button>
      <button onClick={() => setCategoryArchived('cat-1', false)}>
        unarchive-category
      </button>
      <button onClick={() => deleteCategory('cat-1')}>delete-category</button>
      <button onClick={() => createMember('Maria')}>create-member</button>
      <button onClick={() => renameMember('member-1', 'João')}>
        rename-member
      </button>
      <button onClick={() => setMemberArchived('member-1', true)}>
        archive-member
      </button>
      <button onClick={() => setMemberArchived('member-1', false)}>
        unarchive-member
      </button>
      <button onClick={() => deleteMember('member-1')}>delete-member</button>
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

async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.getByText('loading:false')).toBeInTheDocument(),
  );
}

describe('useFinanceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceCategories.mockResolvedValue(right([]));
    listFinanceMembers.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads categories and members sorted by name', async () => {
    listFinanceCategories.mockResolvedValue(
      right([
        { uid: 'cat-2', name: 'Transporte' },
        { uid: 'cat-1', name: 'Mercado' },
      ]),
    );
    listFinanceMembers.mockResolvedValue(
      right([
        { uid: 'member-2', name: 'Zeca' },
        { uid: 'member-1', name: 'Ana' },
      ]),
    );
    renderProbe();
    await waitForLoaded();
    expect(
      screen.getByText('categories:Mercado,Transporte'),
    ).toBeInTheDocument();
    expect(screen.getByText('members:Ana,Zeca')).toBeInTheDocument();
  });

  it('toasts when loading categories fails', async () => {
    listFinanceCategories.mockResolvedValue(
      left(new FakeError('falha categorias')),
    );
    renderProbe();
    await waitForLoaded();
    expect(screen.getByRole('status')).toHaveTextContent('falha categorias');
  });

  it('toasts when loading members fails', async () => {
    listFinanceMembers.mockResolvedValue(left(new FakeError('falha membros')));
    renderProbe();
    await waitForLoaded();
    expect(screen.getByRole('status')).toHaveTextContent('falha membros');
  });

  it('creates a category and refreshes', async () => {
    createFinanceCategory.mockResolvedValue(right({ uid: 'cat-9' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('create-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Categoria criada'),
    );
    expect(createFinanceCategory).toHaveBeenCalledWith({
      name: 'Pets',
      kind: 'expense',
    });
    expect(listFinanceCategories).toHaveBeenCalledTimes(2);
  });

  it('toasts when creating a category fails', async () => {
    createFinanceCategory.mockResolvedValue(left(new FakeError('falha criar')));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('create-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha criar'),
    );
    expect(listFinanceCategories).toHaveBeenCalledTimes(1);
  });

  it('renames a category', async () => {
    updateFinanceCategory.mockResolvedValue(right({ uid: 'cat-1' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('rename-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Categoria renomeada',
      ),
    );
    expect(updateFinanceCategory).toHaveBeenCalledWith('cat-1', {
      name: 'Feira',
    });
  });

  it('archives and unarchives a category', async () => {
    updateFinanceCategory.mockResolvedValue(right({ uid: 'cat-1' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('archive-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Categoria arquivada',
      ),
    );
    expect(updateFinanceCategory).toHaveBeenCalledWith('cat-1', {
      archived: true,
    });
    await userEvent.click(screen.getByText('unarchive-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Categoria desarquivada',
      ),
    );
    expect(updateFinanceCategory).toHaveBeenCalledWith('cat-1', {
      archived: false,
    });
  });

  it('deletes a category and refreshes', async () => {
    deleteFinanceCategory.mockResolvedValue(right(undefined));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('delete-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Categoria excluída',
      ),
    );
    expect(deleteFinanceCategory).toHaveBeenCalledWith('cat-1');
    expect(listFinanceCategories).toHaveBeenCalledTimes(2);
  });

  it('toasts the in-use message when deleting a category fails', async () => {
    deleteFinanceCategory.mockResolvedValue(
      left(new FakeError('A categoria está em uso. Arquive-a.')),
    );
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('delete-category'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'A categoria está em uso. Arquive-a.',
      ),
    );
    expect(listFinanceCategories).toHaveBeenCalledTimes(1);
  });

  it('creates a member and refreshes', async () => {
    createFinanceMember.mockResolvedValue(right({ uid: 'member-9' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('create-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro criado'),
    );
    expect(createFinanceMember).toHaveBeenCalledWith('Maria');
    expect(listFinanceMembers).toHaveBeenCalledTimes(2);
  });

  it('renames a member', async () => {
    updateFinanceMember.mockResolvedValue(right({ uid: 'member-1' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('rename-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro renomeado'),
    );
    expect(updateFinanceMember).toHaveBeenCalledWith('member-1', {
      name: 'João',
    });
  });

  it('archives and unarchives a member', async () => {
    updateFinanceMember.mockResolvedValue(right({ uid: 'member-1' }));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('archive-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro arquivado'),
    );
    expect(updateFinanceMember).toHaveBeenCalledWith('member-1', {
      archived: true,
    });
    await userEvent.click(screen.getByText('unarchive-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Membro desarquivado',
      ),
    );
    expect(updateFinanceMember).toHaveBeenCalledWith('member-1', {
      archived: false,
    });
  });

  it('deletes a member and refreshes', async () => {
    deleteFinanceMember.mockResolvedValue(right(undefined));
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('delete-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro excluído'),
    );
    expect(deleteFinanceMember).toHaveBeenCalledWith('member-1');
    expect(listFinanceMembers).toHaveBeenCalledTimes(2);
  });

  it('toasts the in-use message when deleting a member fails', async () => {
    deleteFinanceMember.mockResolvedValue(
      left(new FakeError('O membro está em uso. Arquive-o.')),
    );
    renderProbe();
    await waitForLoaded();
    await userEvent.click(screen.getByText('delete-member'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'O membro está em uso. Arquive-o.',
      ),
    );
    expect(listFinanceMembers).toHaveBeenCalledTimes(1);
  });
});
