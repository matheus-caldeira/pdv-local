import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

afterEach(cleanup);

describe('Select', () => {
  it('renders options, merges className and forwards selection', async () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Status"
        className="extra"
        value="1"
        onChange={onChange}
      >
        <option value="1">Ativo</option>
        <option value="0">Inativo</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Status' });
    expect(select).toHaveClass('extra');
    await userEvent.selectOptions(select, '0');
    expect(onChange).toHaveBeenCalled();
  });
});
