import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentifySaleModal } from './IdentifySaleModal';

afterEach(cleanup);

function baseProps() {
  return {
    open: true,
    onUseTicket: vi.fn(),
    onEnterName: vi.fn(),
    onClose: vi.fn(),
  };
}

describe('IdentifySaleModal', () => {
  it('não aparece quando fechado', () => {
    render(<IdentifySaleModal {...baseProps()} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explica por que está perguntando', () => {
    render(<IdentifySaleModal {...baseProps()} />);

    expect(
      screen.getByText(
        'Esta venda não tem cliente. Como deseja identificá-la?',
      ),
    ).toBeInTheDocument();
  });

  it('segue com o número da comanda', async () => {
    const props = baseProps();
    render(<IdentifySaleModal {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Usar número da comanda' }),
    );

    expect(props.onUseTicket).toHaveBeenCalledTimes(1);
  });

  it('devolve o usuário para informar o nome', async () => {
    const props = baseProps();
    render(<IdentifySaleModal {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Informar o nome' }),
    );

    expect(props.onEnterName).toHaveBeenCalledTimes(1);
  });

  it('fecha pelo Escape', async () => {
    const props = baseProps();
    render(<IdentifySaleModal {...props} />);

    await userEvent.keyboard('{Escape}');

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
