import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('renders an accent button by default and is clickable', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveClass('bg-accent');
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders the ghost variant', () => {
    render(<Button variant="ghost">Cancelar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-surface-2');
  });

  it('renders the danger variant', () => {
    render(<Button variant="danger">Remover</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger');
  });

  it('supports small size and full width', () => {
    render(
      <Button size="sm" fullWidth>
        Pagar
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-sm');
    expect(button).toHaveClass('w-full');
  });

  it('merges a custom class and honors an explicit type', () => {
    render(
      <Button type="submit" className="mt-2">
        Enviar
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('mt-2');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
