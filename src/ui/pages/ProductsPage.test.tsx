import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductsPage } from './ProductsPage';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import type { ProductInput } from '../../domain/product/product.rules';

const listProducts = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const removeProduct = vi.fn();
const listGroups = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    listProducts: () => listProducts(),
    createProduct: (input: ProductInput) => createProduct(input),
    updateProduct: (id: number, input: ProductInput) =>
      updateProduct(id, input),
    removeProduct: (id: number) => removeProduct(id),
    listGroups: () => listGroups(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const coca = {
  id: 1,
  name: 'Coca',
  category: 'Bebidas',
  costPrice: 2,
  salePrice: 5,
  stock: 10,
  active: true,
  customizationGroupIds: [],
  createdAt: 0,
  updatedAt: 0,
};

const burger = {
  id: 2,
  name: 'X-Burger',
  category: 'Lanches',
  costPrice: 8,
  salePrice: 20,
  stock: 3,
  active: false,
  customizationGroupIds: [10],
  createdAt: 0,
  updatedAt: 0,
};

const semEstoque = {
  ...coca,
  id: 3,
  name: 'Agua',
  category: '',
  costPrice: 0,
  stock: 0,
  customizationGroupIds: [],
};

const groups = [
  {
    id: 10,
    name: 'Adicionais',
    required: true,
    minQty: 0,
    maxQty: 3,
    chargeAfter: 0,
  },
  {
    id: 11,
    name: 'Molhos',
    required: false,
    minQty: 0,
    maxQty: 3,
    chargeAfter: 0,
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <ProductsPage />
    </ToastProvider>,
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    listProducts.mockReset();
    createProduct.mockReset();
    updateProduct.mockReset();
    removeProduct.mockReset();
    listGroups.mockReset();
    listProducts.mockResolvedValue(right([coca, burger, semEstoque]));
    listGroups.mockResolvedValue(right(groups));
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders sorted products with stock tones and customization badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    const names = screen
      .getAllByText(/Agua|Coca|X-Burger/)
      .map((n) => n.textContent);
    expect(names).toEqual(['Agua', 'Coca', 'X-Burger']);
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
    expect(screen.getByText('3 un.')).toBeInTheDocument();
    expect(screen.getByText('10 un.')).toBeInTheDocument();
    expect(screen.getByText('Sem categoria')).toBeInTheDocument();
  });

  it('shows the empty state when there are no products', async () => {
    listProducts.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Nenhum produto cadastrado')).toBeInTheDocument(),
    );
  });

  it('filters by name or category and shows the not-found state', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    const search = screen.getByRole('textbox', { name: 'Buscar produtos' });
    await userEvent.type(search, 'lanch');
    expect(screen.getByText('X-Burger')).toBeInTheDocument();
    expect(screen.queryByText('Coca')).not.toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, 'agu');
    expect(screen.getByText('Agua')).toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
  });

  it('creates a product through the modal with a chip toggle', async () => {
    createProduct.mockResolvedValue(right({ id: 99 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Produto/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Nome do Produto'),
      'Suco',
    );
    await userEvent.type(within(dialog).getByLabelText('Categoria'), 'Bebidas');
    await userEvent.type(
      within(dialog).getByLabelText('Preco de Custo (R$)'),
      '1',
    );
    await userEvent.type(
      within(dialog).getByLabelText('Preco de Venda (R$)'),
      '4',
    );
    await userEvent.type(within(dialog).getByLabelText('Estoque'), '5');
    const chip = within(dialog).getByRole('button', { name: /Adicionais/ });
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(createProduct).toHaveBeenCalledWith({
      name: 'Suco',
      category: 'Bebidas',
      costPrice: 1,
      salePrice: 4,
      stock: 5,
      active: true,
      customizationGroupIds: [10],
    });
  });

  it('falls back to zero when the number fields are cleared', async () => {
    updateProduct.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Editar Coca' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.clear(within(dialog).getByLabelText('Preco de Custo (R$)'));
    await userEvent.clear(within(dialog).getByLabelText('Preco de Venda (R$)'));
    await userEvent.clear(within(dialog).getByLabelText('Estoque'));
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() => expect(updateProduct).toHaveBeenCalled());
    expect(updateProduct).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ costPrice: 0, salePrice: 0, stock: 0 }),
    );
  });

  it('keeps the modal open and toasts when create returns Left', async () => {
    createProduct.mockResolvedValue(left(new FakeError('Informe o nome.')));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Produto/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Informe o nome.'),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('edits an existing product, toggling status to inactive', async () => {
    updateProduct.mockResolvedValue(right({ id: 1 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Editar Coca' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Nome do Produto')).toHaveValue(
      'Coca',
    );
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), '0');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Salvar' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(updateProduct).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: 'Coca', active: false }),
    );
  });

  it('closes the modal via the backdrop', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Produto/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('hides the chip picker when there are no groups', async () => {
    listGroups.mockResolvedValue(right([]));
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /Novo Produto/ }));
    expect(
      screen.queryByText('Grupos de Customizacao'),
    ).not.toBeInTheDocument();
  });

  it('removes a product after confirmation', async () => {
    removeProduct.mockResolvedValue(right(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Remover Coca' }));
    await waitFor(() => expect(removeProduct).toHaveBeenCalledWith(1));
  });

  it('does not remove when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('Coca')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Remover Coca' }));
    expect(removeProduct).not.toHaveBeenCalled();
  });
});
