import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField';

afterEach(cleanup);

describe('TextField', () => {
  it('renders an input and forwards typing', async () => {
    const onChange = vi.fn();
    render(<TextField aria-label="Nome" value="" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Nome'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('merges a custom class', () => {
    render(<TextField aria-label="Telefone" className="mt-4" readOnly />);
    expect(screen.getByLabelText('Telefone')).toHaveClass('mt-4');
  });
});
