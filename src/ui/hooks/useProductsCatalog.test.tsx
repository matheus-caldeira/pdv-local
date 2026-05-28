import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useProductsCatalog } from './useProductsCatalog';
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

const INPUT: ProductInput = {
  name: 'Coca',
  category: 'Bebidas',
  costPrice: 2,
  salePrice: 5,
  stock: 10,
  active: true,
  customizationGroupIds: [],
};

function Probe() {
  const { products, groups, saveProduct, removeProduct } = useProductsCatalog();
  return (
    <div>
      <span>products:{products.map((p) => p.name).join(',')}</span>
      <span>groups:{groups.map((g) => g.name).join(',')}</span>
      <button onClick={() => saveProduct(INPUT)}>create</button>
      <button onClick={() => saveProduct(INPUT, 7)}>update</button>
      <button onClick={() => removeProduct(9)}>remove</button>
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

describe('useProductsCatalog', () => {
  beforeEach(() => {
    listProducts.mockReset();
    createProduct.mockReset();
    updateProduct.mockReset();
    removeProduct.mockReset();
    listGroups.mockReset();
    listProducts.mockResolvedValue(right([]));
    listGroups.mockResolvedValue(right([]));
  });
  afterEach(cleanup);

  it('loads and sorts products and groups', async () => {
    listProducts.mockResolvedValue(
      right([
        { id: 1, name: 'Zebra' },
        { id: 2, name: 'Abacaxi' },
      ]),
    );
    listGroups.mockResolvedValue(right([{ id: 1, name: 'Extras' }]));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByText('products:Abacaxi,Zebra')).toBeInTheDocument(),
    );
    expect(screen.getByText('groups:Extras')).toBeInTheDocument();
  });

  it('toasts when loading products or groups fails', async () => {
    listProducts.mockResolvedValue(left(new FakeError('falha produtos')));
    listGroups.mockResolvedValue(left(new FakeError('falha grupos')));
    renderProbe();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha grupos'),
    );
  });

  it('creates a product and refreshes', async () => {
    createProduct.mockResolvedValue(right({ id: 1, name: 'Coca' }));
    renderProbe();
    await waitFor(() => expect(listProducts).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Produto criado'),
    );
    expect(createProduct).toHaveBeenCalledWith(INPUT);
    expect(listProducts).toHaveBeenCalledTimes(2);
  });

  it('updates a product', async () => {
    updateProduct.mockResolvedValue(right({ id: 7, name: 'Coca' }));
    renderProbe();
    await waitFor(() => expect(listProducts).toHaveBeenCalled());
    await userEvent.click(screen.getByText('update'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Produto atualizado',
      ),
    );
    expect(updateProduct).toHaveBeenCalledWith(7, INPUT);
  });

  it('toasts and returns false when saving fails', async () => {
    createProduct.mockResolvedValue(left(new FakeError('nome invalido')));
    renderProbe();
    await waitFor(() => expect(listProducts).toHaveBeenCalled());
    await userEvent.click(screen.getByText('create'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('nome invalido'),
    );
    expect(listProducts).toHaveBeenCalledTimes(1);
  });

  it('removes a product and refreshes', async () => {
    removeProduct.mockResolvedValue(right(undefined));
    renderProbe();
    await waitFor(() => expect(listProducts).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Produto removido'),
    );
    expect(removeProduct).toHaveBeenCalledWith(9);
    expect(listProducts).toHaveBeenCalledTimes(2);
  });

  it('toasts when removing fails', async () => {
    removeProduct.mockResolvedValue(left(new FakeError('falha remover')));
    renderProbe();
    await waitFor(() => expect(listProducts).toHaveBeenCalled());
    await userEvent.click(screen.getByText('remove'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha remover'),
    );
    expect(listProducts).toHaveBeenCalledTimes(1);
  });
});
