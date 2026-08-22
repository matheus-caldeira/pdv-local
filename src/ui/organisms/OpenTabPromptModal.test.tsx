import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenTabPromptModal } from './OpenTabPromptModal';
import type { Order } from '../../domain/order/order.entity';

afterEach(cleanup);

const tab: Order = {
  uid: 't-1',
  businessTypeId: 'scout',
  sessionUid: 'session-1',
  items: [],
  total: 0,
  paymentMethod: null,
  customerName: 'Maju',
  customerPhone: '',
  ticket: '0012',
  stage: 'aceito',
  status: 'open',
  createdAt: 1,
  updatedAt: 1,
};

describe('OpenTabPromptModal', () => {
  it('não aparece sem comanda', () => {
    render(
      <OpenTabPromptModal
        tab={null}
        customerName="Maju"
        onUseTab={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.queryByText(/comanda/i)).not.toBeInTheDocument();
  });

  it('anuncia a comanda aberta do cliente', () => {
    render(
      <OpenTabPromptModal
        tab={tab}
        customerName="Maju"
        onUseTab={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Maju tem a comanda nº 0012 aberta. Lançar nela?'),
    ).toBeInTheDocument();
  });

  it('usa a comanda quando confirmado', async () => {
    const onUseTab = vi.fn();
    render(
      <OpenTabPromptModal
        tab={tab}
        customerName="Maju"
        onUseTab={onUseTab}
        onDismiss={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Usar comanda nº 0012' }),
    );

    expect(onUseTab).toHaveBeenCalledTimes(1);
  });

  it('segue como venda avulsa quando dispensado', async () => {
    const onDismiss = vi.fn();
    render(
      <OpenTabPromptModal
        tab={tab}
        customerName="Maju"
        onUseTab={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Continuar venda avulsa' }),
    );

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dispensa ao fechar o modal pelo Escape', async () => {
    const onDismiss = vi.fn();
    render(
      <OpenTabPromptModal
        tab={tab}
        customerName="Maju"
        onUseTab={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    await userEvent.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
