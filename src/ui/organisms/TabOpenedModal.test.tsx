import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabOpenedModal } from './TabOpenedModal';
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
  ticket: '0007',
  stage: 'aceito',
  status: 'open',
  createdAt: 1,
  updatedAt: 1,
};

describe('TabOpenedModal', () => {
  it('não aparece sem comanda', () => {
    render(
      <TabOpenedModal tab={null} onContinue={vi.fn()} onPrint={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra o número da comanda e o nome do cliente', () => {
    render(<TabOpenedModal tab={tab} onContinue={vi.fn()} onPrint={vi.fn()} />);

    expect(screen.getByText('0007')).toBeInTheDocument();
    expect(screen.getByText('Maju')).toBeInTheDocument();
  });

  it('omite o nome quando a comanda não tem cliente', () => {
    render(
      <TabOpenedModal
        tab={{ ...tab, customerName: '' }}
        onContinue={vi.fn()}
        onPrint={vi.fn()}
      />,
    );

    expect(screen.getByText('0007')).toBeInTheDocument();
  });

  it('continua comprando', async () => {
    const onContinue = vi.fn();
    render(
      <TabOpenedModal tab={tab} onContinue={onContinue} onPrint={vi.fn()} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Continuar comprando' }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('imprime o número', async () => {
    const onPrint = vi.fn();
    render(<TabOpenedModal tab={tab} onContinue={vi.fn()} onPrint={onPrint} />);

    await userEvent.click(
      screen.getByRole('button', { name: /Imprimir número/ }),
    );

    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it('fecha pelo Escape como continuar', async () => {
    const onContinue = vi.fn();
    render(
      <TabOpenedModal tab={tab} onContinue={onContinue} onPrint={vi.fn()} />,
    );

    await userEvent.keyboard('{Escape}');

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
