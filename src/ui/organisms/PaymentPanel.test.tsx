import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentPanel } from './PaymentPanel';

afterEach(cleanup);

describe('PaymentPanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PaymentPanel
        open={false}
        total={10}
        onClose={vi.fn()}
        onFinalize={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('finalizes immediately as a tab with null method', async () => {
    const onFinalize = vi.fn();
    render(
      <PaymentPanel
        open
        total={25}
        onClose={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    expect(screen.getByText('Como deseja pagar?')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir comanda' }),
    );
    expect(onFinalize).toHaveBeenCalledWith('tab', null);
  });

  it('pays now after selecting a method', async () => {
    const onFinalize = vi.fn();
    render(
      <PaymentPanel
        open
        total={30}
        onClose={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pagar agora' }));
    expect(screen.getByText('Forma de Pagamento')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Confirmar Pagamento' });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /PIX/ }));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onFinalize).toHaveBeenCalledWith('now', 'pix');
  });

  it('pays on delivery after selecting a method', async () => {
    const onFinalize = vi.fn();
    render(
      <PaymentPanel
        open
        total={40}
        onClose={vi.fn()}
        onFinalize={onFinalize}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Pagar na entrega' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Dinheiro/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar Pagamento' }),
    );
    expect(onFinalize).toHaveBeenCalledWith('delivery', 'dinheiro');
  });

  it('resets step and selection when closed via Escape', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <PaymentPanel open total={10} onClose={onClose} onFinalize={vi.fn()} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pagar agora' }));
    expect(screen.getByText('Forma de Pagamento')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    rerender(
      <PaymentPanel open total={10} onClose={onClose} onFinalize={vi.fn()} />,
    );
    expect(screen.getByText('Como deseja pagar?')).toBeInTheDocument();
  });
});
