import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

afterEach(cleanup);

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Titulo">
        conteudo
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and children when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Forma de Pagamento">
        <p>conteudo</p>
      </Modal>,
    );
    expect(
      screen.getByRole('dialog', { name: 'Forma de Pagamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titulo">
        conteudo
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores other keys', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titulo">
        conteudo
      </Modal>,
    );
    await userEvent.keyboard('{Enter}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when clicking the backdrop but not the panel', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Titulo">
        <p>conteudo</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText('conteudo'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
