import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Order } from '../../domain/order/order.entity';
import { TabSelector } from './TabSelector';

const tabs = [
  { uid: 'a', ticket: '001', customerName: 'Maju (Lobinha)', total: 0 },
  { uid: 'b', ticket: '002', customerName: 'Pedro (Escoteiro)', total: 15 },
] as Order[];

describe('TabSelector', () => {
  afterEach(cleanup);

  it('lista as comandas abertas', () => {
    render(
      <TabSelector
        tabs={tabs}
        selectedUid={null}
        onSelect={vi.fn()}
        onOpenNew={vi.fn()}
      />,
    );

    expect(screen.getByRole('option', { name: /001/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /002/ })).toBeInTheDocument();
  });

  it('avisa quando escolhem uma comanda', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TabSelector
        tabs={tabs}
        selectedUid={null}
        onSelect={onSelect}
        onOpenNew={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/comanda/i), 'b');

    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('oferece abrir uma comanda nova', async () => {
    const onOpenNew = vi.fn();
    const user = userEvent.setup();
    render(
      <TabSelector
        tabs={tabs}
        selectedUid={null}
        onSelect={vi.fn()}
        onOpenNew={onOpenNew}
      />,
    );

    await user.click(screen.getByRole('button', { name: /nova comanda/i }));

    expect(onOpenNew).toHaveBeenCalled();
  });

  it('mostra aviso quando não há comanda aberta', () => {
    render(
      <TabSelector
        tabs={[]}
        selectedUid={null}
        onSelect={vi.fn()}
        onOpenNew={vi.fn()}
      />,
    );

    expect(screen.getByText(/nenhuma comanda aberta/i)).toBeInTheDocument();
  });

  it('volta para venda avulsa ao escolher a opção vazia', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <TabSelector
        tabs={tabs}
        selectedUid="a"
        onSelect={onSelect}
        onOpenNew={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/comanda/i), '');

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
