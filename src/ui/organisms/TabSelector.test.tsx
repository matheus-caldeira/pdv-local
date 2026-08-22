import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabSelector } from './TabSelector';
import type { Order } from '../../domain/order/order.entity';

afterEach(cleanup);

function makeTab(overrides: Partial<Order> & { uid: string }): Order {
  return {
    businessTypeId: 'scout',
    sessionUid: 'session-1',
    items: [],
    total: 0,
    paymentMethod: null,
    customerName: 'Maju',
    customerPhone: '',
    ticket: '0001',
    stage: 'aceito',
    status: 'open',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const tabs: Order[] = [
  makeTab({ uid: 't-1', ticket: '0001', customerName: 'Maju' }),
  makeTab({ uid: 't-2', ticket: '0042', customerName: 'Pedro' }),
];

describe('TabSelector', () => {
  it('avisa quando não há comanda aberta', () => {
    render(<TabSelector tabs={[]} selectedUid={null} onSelect={vi.fn()} />);

    expect(screen.getByText('Nenhuma comanda aberta')).toBeInTheDocument();
  });

  it('filtra pelo número da comanda', async () => {
    render(<TabSelector tabs={tabs} selectedUid={null} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Comanda'), '0042');

    expect(screen.getByRole('option', { name: /Pedro/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Maju/ }),
    ).not.toBeInTheDocument();
  });

  it('filtra pelo nome do cliente', async () => {
    render(<TabSelector tabs={tabs} selectedUid={null} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Comanda'), 'maju');

    expect(screen.getByRole('option', { name: /Maju/ })).toBeInTheDocument();
  });

  it('seleciona a comanda escolhida', async () => {
    const onSelect = vi.fn();
    render(<TabSelector tabs={tabs} selectedUid={null} onSelect={onSelect} />);

    await userEvent.type(screen.getByLabelText('Comanda'), 'pedro');
    await userEvent.click(screen.getByRole('option', { name: /Pedro/ }));

    expect(onSelect).toHaveBeenCalledWith('t-2');
  });

  it('mostra a comanda já selecionada no campo', () => {
    render(<TabSelector tabs={tabs} selectedUid="t-1" onSelect={vi.fn()} />);

    expect(screen.getByLabelText('Comanda')).toHaveValue('0001 — Maju');
  });

  it('limpa a seleção quando o campo é esvaziado', async () => {
    const onSelect = vi.fn();
    render(<TabSelector tabs={tabs} selectedUid="t-1" onSelect={onSelect} />);

    await userEvent.clear(screen.getByLabelText('Comanda'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('atualiza o campo quando a comanda selecionada muda externamente', () => {
    const { rerender } = render(
      <TabSelector tabs={tabs} selectedUid="t-1" onSelect={vi.fn()} />,
    );

    rerender(<TabSelector tabs={tabs} selectedUid="t-2" onSelect={vi.fn()} />);

    expect(screen.getByLabelText('Comanda')).toHaveValue('0042 — Pedro');
  });

  it('limpa o campo quando a seleção é removida externamente', () => {
    const { rerender } = render(
      <TabSelector tabs={tabs} selectedUid="t-1" onSelect={vi.fn()} />,
    );

    rerender(<TabSelector tabs={tabs} selectedUid={null} onSelect={vi.fn()} />);

    expect(screen.getByLabelText('Comanda')).toHaveValue('');
  });
});
