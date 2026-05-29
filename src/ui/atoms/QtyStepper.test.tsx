import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QtyStepper } from './QtyStepper';

afterEach(cleanup);

describe('QtyStepper', () => {
  it('shows the qty and triggers increment and decrement', async () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();
    render(
      <QtyStepper
        qty={3}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Diminuir' }));
    expect(onIncrement).toHaveBeenCalledOnce();
    expect(onDecrement).toHaveBeenCalledOnce();
  });

  it('disables increment when requested', () => {
    render(
      <QtyStepper
        qty={1}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        incrementDisabled
      />,
    );
    expect(screen.getByRole('button', { name: 'Aumentar' })).toBeDisabled();
  });

  it('hides the qty and decrement when hideZero and qty is zero', () => {
    render(
      <QtyStepper
        qty={0}
        hideZero
        size="sm"
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
      />,
    );
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Diminuir' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aumentar' }),
    ).toBeInTheDocument();
  });
});
