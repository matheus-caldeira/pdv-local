import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthPicker } from './MonthPicker';

describe('MonthPicker', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the month label in Portuguese', () => {
    render(<MonthPicker value="2026-07" onChange={vi.fn()} />);
    expect(
      screen.getByRole('group', { name: 'Seleção de mês' }),
    ).toBeInTheDocument();
    expect(screen.getByText('julho de 2026')).toBeInTheDocument();
  });

  it('emits the previous month when clicking the previous button', async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-07" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenCalledWith('2026-06');
  });

  it('emits the next month when clicking the next button', async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-07" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onChange).toHaveBeenCalledWith('2026-08');
  });

  it('crosses year boundaries in both directions', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MonthPicker value="2026-01" onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(onChange).toHaveBeenCalledWith('2025-12');
    rerender(<MonthPicker value="2026-12" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(onChange).toHaveBeenCalledWith('2027-01');
  });
});
