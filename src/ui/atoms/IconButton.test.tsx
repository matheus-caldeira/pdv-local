import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});
