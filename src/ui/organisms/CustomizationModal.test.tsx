import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomizationModal } from './CustomizationModal';
import { ToastProvider } from '../molecules/Toast';
import type { Product } from '../../domain/product/product.entity';
import type { LoadedCustomizationGroup } from '../hooks/useCustomizationLoader';

afterEach(cleanup);

const product: Product = {
  id: 1,
  name: 'X-Burger',
  category: 'Lanches',
  costPrice: 5,
  salePrice: 20,
  stock: 10,
  active: true,
  customizationGroupIds: [1],
  createdAt: 0,
  updatedAt: 0,
};

function group(
  partial: Partial<LoadedCustomizationGroup> & {
    id: number;
    name: string;
    items: LoadedCustomizationGroup['items'];
  },
): LoadedCustomizationGroup {
  return {
    required: false,
    minQty: 0,
    maxQty: 3,
    chargeAfter: 0,
    ...partial,
  };
}

function renderModal(
  groups: LoadedCustomizationGroup[],
  onConfirm = vi.fn(),
  onClose = vi.fn(),
) {
  render(
    <ToastProvider>
      <CustomizationModal
        product={product}
        groups={groups}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </ToastProvider>,
  );
  return { onConfirm, onClose };
}

describe('CustomizationModal', () => {
  it('blocks confirm and toasts when a required group is missing', async () => {
    const { onConfirm } = renderModal([
      group({
        id: 1,
        name: 'Ponto',
        required: true,
        minQty: 1,
        maxQty: 1,
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Bem passado',
            price: 0,
            maxQty: 0,
            chargeAfter: 0,
            active: true,
          },
        ],
      }),
    ]);
    expect(screen.getByText('Obrigatorio · 1-1')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar · R$ 20,00' }),
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Selecione pelo menos 1 em "Ponto"',
    );
  });

  it('adds with no customizations when nothing is selected', async () => {
    const { onConfirm } = renderModal([
      group({
        id: 1,
        name: 'Extras',
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Bacon',
            price: 3,
            maxQty: 0,
            chargeAfter: 0,
            active: true,
          },
        ],
      }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 1,
        qty: 1,
        customizations: undefined,
        customizationTotal: undefined,
        observation: undefined,
      }),
    );
  });

  it('respects item maxQty, computes extra and confirms with customizations', async () => {
    const { onConfirm } = renderModal([
      group({
        id: 1,
        name: 'Adicionais',
        maxQty: 5,
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Bacon',
            price: 3,
            maxQty: 2,
            chargeAfter: 0,
            active: true,
          },
        ],
      }),
    ]);
    expect(screen.getByText('max 2')).toBeInTheDocument();
    const add = screen.getByRole('button', { name: 'Aumentar' });
    await userEvent.click(add);
    await userEvent.click(add);
    expect(add).toBeDisabled();
    expect(screen.getByText('Adicionais: +')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Adicionar ·/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        customizationTotal: 6,
        customizations: [
          {
            groupName: 'Adicionais',
            items: [{ name: 'Bacon', qty: 2, price: 3 }],
          },
        ],
      }),
    );
  });

  it('respects group maxQty across items', async () => {
    renderModal([
      group({
        id: 1,
        name: 'Molhos',
        maxQty: 1,
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Barbecue',
            price: 0,
            maxQty: 0,
            chargeAfter: 0,
            active: true,
          },
          {
            id: 12,
            groupId: 1,
            name: 'Maionese',
            price: 0,
            maxQty: 0,
            chargeAfter: 0,
            active: true,
          },
        ],
      }),
    ]);
    const buttons = screen.getAllByRole('button', { name: 'Aumentar' });
    await userEvent.click(buttons[0]);
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(buttons[1]).toBeDisabled();
  });

  it('decrements without going below zero and shows free label', async () => {
    renderModal([
      group({
        id: 1,
        name: 'Adicionais',
        chargeAfter: 0,
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Cheddar',
            price: 2,
            maxQty: 3,
            chargeAfter: 1,
            active: true,
          },
        ],
      }),
    ]);
    expect(screen.getByText('(1 gratis)')).toBeInTheDocument();
    const add = screen.getByRole('button', { name: 'Aumentar' });
    await userEvent.click(add);
    await userEvent.click(add);
    const dec = screen.getByRole('button', { name: 'Diminuir' });
    await userEvent.click(dec);
    await userEvent.click(dec);
    expect(
      within(screen.getByRole('dialog')).queryByText('Diminuir'),
    ).not.toBeInTheDocument();
  });

  it('shows the group free quota label and saves observation', async () => {
    const { onConfirm } = renderModal([
      group({
        id: 1,
        name: 'Adicionais',
        chargeAfter: 2,
        items: [
          {
            id: 11,
            groupId: 1,
            name: 'Bacon',
            price: 3,
            maxQty: 0,
            chargeAfter: 0,
            active: true,
          },
        ],
      }),
    ]);
    expect(screen.getByText(/2 gratis/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    await userEvent.type(screen.getByLabelText('Observacao'), 'Sem cebola');
    await userEvent.click(screen.getByRole('button', { name: /^Adicionar ·/ }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        observation: 'Sem cebola',
        customizationTotal: undefined,
      }),
    );
  });

  it('closes via the backdrop', async () => {
    const { onClose } = renderModal([
      group({ id: 1, name: 'Extras', items: [] }),
    ]);
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
