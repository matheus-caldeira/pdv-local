import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceSettingsPage } from './FinanceSettingsPage';
import { ToastProvider } from '../../molecules/Toast';
import { left, right } from '../../../domain/shared/either';
import { AppError } from '../../../domain/shared/errors';
import type {
  FamilyMember,
  FinanceCategory,
} from '../../../domain/finance/finance.entity';

const listFinanceCategories = vi.fn();
const listFinanceMembers = vi.fn();
const createFinanceCategory = vi.fn();
const updateFinanceCategory = vi.fn();
const deleteFinanceCategory = vi.fn();
const createFinanceMember = vi.fn();
const updateFinanceMember = vi.fn();
const deleteFinanceMember = vi.fn();
const listPaymentMethods = vi.fn();

vi.mock('../../../app/container', () => ({
  container: {
    listFinanceCategories: () => listFinanceCategories(),
    listFinanceMembers: () => listFinanceMembers(),
    createFinanceCategory: (input: unknown) => createFinanceCategory(input),
    updateFinanceCategory: (uid: string, changes: unknown) =>
      updateFinanceCategory(uid, changes),
    deleteFinanceCategory: (uid: string) => deleteFinanceCategory(uid),
    createFinanceMember: (name: string) => createFinanceMember(name),
    updateFinanceMember: (uid: string, changes: unknown) =>
      updateFinanceMember(uid, changes),
    deleteFinanceMember: (uid: string) => deleteFinanceMember(uid),
    listPaymentMethods: () => listPaymentMethods(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const CATEGORIES: FinanceCategory[] = [
  {
    id: 1,
    uid: 'cat-1',
    name: 'Mercado',
    kind: 'expense',
    archived: false,
    createdAt: 1700000000000,
  },
  {
    id: 2,
    uid: 'cat-2',
    name: 'Salário',
    kind: 'income',
    archived: false,
    createdAt: 1700000000000,
  },
  {
    id: 3,
    uid: 'cat-3',
    name: 'Antiga',
    kind: 'expense',
    archived: true,
    createdAt: 1700000000000,
  },
];

const MEMBERS: FamilyMember[] = [
  {
    id: 1,
    uid: 'member-1',
    name: 'Eu',
    archived: false,
    createdAt: 1700000000000,
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <FinanceSettingsPage />
    </ToastProvider>,
  );
}

async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument(),
  );
}

describe('FinanceSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFinanceCategories.mockResolvedValue(right(CATEGORIES));
    listFinanceMembers.mockResolvedValue(right(MEMBERS));
    listPaymentMethods.mockResolvedValue(right([]));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the loading state while data is being fetched', () => {
    listFinanceCategories.mockReturnValue(new Promise(() => {}));
    listFinanceMembers.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByText('Categorias')).not.toBeInTheDocument();
  });

  it('renders both sections with categories grouped by kind and members', async () => {
    renderPage();
    await waitForLoaded();
    expect(
      screen.getByRole('heading', { name: 'Configurações do financeiro' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Categorias' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Membros da família' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(screen.getByText('Saídas')).toBeInTheDocument();
    expect(screen.getByText('Salário')).toBeInTheDocument();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText('Eu')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mostrar arquivadas (1)' }),
    ).toBeInTheDocument();
  });

  it('renders the payment methods section', async () => {
    renderPage();
    await waitForLoaded();
    expect(
      screen.getByRole('heading', { name: 'Meios de pagamento' }),
    ).toBeInTheDocument();
  });

  it('renders the empty states when there is no data', async () => {
    listFinanceCategories.mockResolvedValue(right([]));
    listFinanceMembers.mockResolvedValue(right([]));
    renderPage();
    await waitForLoaded();
    expect(screen.getByText('Nenhuma categoria ativa.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum membro ativo.')).toBeInTheDocument();
  });

  it('toasts when loading fails', async () => {
    listFinanceCategories.mockResolvedValue(
      left(new FakeError('falha ao carregar')),
    );
    renderPage();
    await waitForLoaded();
    expect(screen.getByRole('status')).toHaveTextContent('falha ao carregar');
  });

  it('creates a category through the form', async () => {
    createFinanceCategory.mockResolvedValue(right(CATEGORIES[0]));
    renderPage();
    await waitForLoaded();
    await userEvent.type(screen.getByLabelText('Nome da categoria'), 'Pets');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar categoria/ }),
    );
    expect(createFinanceCategory).toHaveBeenCalledWith({
      name: 'Pets',
      kind: 'expense',
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Categoria criada'),
    );
  });

  it('creates a member through the form', async () => {
    createFinanceMember.mockResolvedValue(right(MEMBERS[0]));
    renderPage();
    await waitForLoaded();
    await userEvent.type(screen.getByLabelText('Nome do membro'), 'Maria');
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar membro/ }),
    );
    expect(createFinanceMember).toHaveBeenCalledWith('Maria');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro criado'),
    );
  });

  it('archives a category from the list', async () => {
    updateFinanceCategory.mockResolvedValue(right(CATEGORIES[0]));
    renderPage();
    await waitForLoaded();
    await userEvent.click(
      screen.getByRole('button', { name: 'Arquivar Mercado' }),
    );
    expect(updateFinanceCategory).toHaveBeenCalledWith('cat-1', {
      archived: true,
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Categoria arquivada',
      ),
    );
  });

  it('shows the in-use error and keeps archive as an alternative when deleting a category fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteFinanceCategory.mockResolvedValue(
      left(
        new FakeError(
          'A categoria está em uso e não pode ser excluída. Arquive-a.',
        ),
      ),
    );
    renderPage();
    await waitForLoaded();
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir Mercado' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'A categoria está em uso e não pode ser excluída. Arquive-a.',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Arquivar Mercado' }),
    ).toBeInTheDocument();
  });

  it('shows the in-use error and keeps archive as an alternative when deleting a member fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteFinanceMember.mockResolvedValue(
      left(
        new FakeError(
          'O membro está em uso e não pode ser excluído. Arquive-o.',
        ),
      ),
    );
    renderPage();
    await waitForLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Eu' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'O membro está em uso e não pode ser excluído. Arquive-o.',
      ),
    );
    expect(
      screen.getByRole('button', { name: 'Arquivar Eu' }),
    ).toBeInTheDocument();
  });

  it('deletes a member after confirmation and refreshes', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteFinanceMember.mockResolvedValue(right(undefined));
    renderPage();
    await waitForLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Eu' }));
    expect(deleteFinanceMember).toHaveBeenCalledWith('member-1');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Membro excluído'),
    );
    expect(listFinanceMembers).toHaveBeenCalledTimes(2);
  });

  it('renames a member through the modal', async () => {
    updateFinanceMember.mockResolvedValue(right(MEMBERS[0]));
    renderPage();
    await waitForLoaded();
    await userEvent.click(screen.getByRole('button', { name: 'Renomear Eu' }));
    const input = screen.getByLabelText('Nome');
    await userEvent.clear(input);
    await userEvent.type(input, 'Matheus');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateFinanceMember).toHaveBeenCalledWith('member-1', {
      name: 'Matheus',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});
