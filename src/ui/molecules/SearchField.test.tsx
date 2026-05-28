import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './SearchField';

afterEach(cleanup);

describe('SearchField', () => {
  it('renders an input and forwards typing', async () => {
    const onChange = vi.fn();
    render(
      <SearchField
        aria-label="Buscar"
        className="extra"
        value=""
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Buscar' });
    expect(input).toHaveClass('extra');
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
