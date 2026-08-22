import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconButton } from './IconButton';

afterEach(cleanup);

describe('IconButton', () => {
  it('renders a button with type button by default and fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Editar" onClick={onClick}>
        x
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Editar' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('text-ink-secondary');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies danger tone, md size and merges className', () => {
    render(
      <IconButton
        tone="danger"
        size="md"
        className="extra"
        aria-label="Remover"
      >
        x
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Remover' });
    expect(button).toHaveClass('text-danger');
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('extra');
  });

  it('mostra o rótulo ao segurar o botão', async () => {
    vi.useFakeTimers();
    render(<IconButton aria-label="Cliente">x</IconButton>);
    const button = screen.getByRole('button', { name: 'Cliente' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Cliente');
    vi.useRealTimers();
  });

  it('esconde o rótulo ao soltar', async () => {
    vi.useFakeTimers();
    render(<IconButton aria-label="Cliente">x</IconButton>);
    const button = screen.getByRole('button', { name: 'Cliente' });

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.pointerUp(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('cancela o rótulo quando o dedo sai do botão antes do tempo', () => {
    vi.useFakeTimers();
    render(<IconButton aria-label="Cliente">x</IconButton>);
    const button = screen.getByRole('button', { name: 'Cliente' });

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerLeave(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('cancela o rótulo no pointercancel', () => {
    vi.useFakeTimers();
    render(<IconButton aria-label="Cliente">x</IconButton>);
    const button = screen.getByRole('button', { name: 'Cliente' });

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerCancel(button);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('não dispara o clique quando o toque longo mostrou o rótulo', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Cliente" onClick={onClick}>
        x
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Cliente' });

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('dispara o clique normalmente num toque curto', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Cliente" onClick={onClick}>
        x
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Cliente' });

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.pointerUp(button);
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('não mostra rótulo quando não há aria-label', () => {
    vi.useFakeTimers();
    render(<IconButton>x</IconButton>);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
