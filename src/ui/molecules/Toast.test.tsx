import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ToastProvider } from './Toast';
import { useToast } from './toast-context';

function Trigger({ type }: { type?: 'success' | 'error' | 'info' }) {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast('Venda registrada!', type)}>
      go
    </button>
  );
}

describe('Toast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('defaults to a no-op outside a provider', () => {
    render(<Trigger />);
    act(() => {
      screen.getByText('go').click();
    });
    expect(screen.queryByText('Venda registrada!')).not.toBeInTheDocument();
  });

  it('shows a success message then auto-hides', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger type="success" />
      </ToastProvider>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveClass('opacity-0');

    act(() => {
      screen.getByText('go').click();
    });
    expect(screen.getByRole('status')).toHaveClass('opacity-100');
    expect(screen.getByRole('status')).toHaveClass('bg-success');

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole('status')).toHaveClass('opacity-0');
  });

  it('uses danger styling for errors', () => {
    render(
      <ToastProvider>
        <Trigger type="error" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText('go').click();
    });
    expect(screen.getByRole('status')).toHaveClass('bg-danger');
  });

  it('uses info styling for info', () => {
    render(
      <ToastProvider>
        <Trigger type="info" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText('go').click();
    });
    expect(screen.getByRole('status')).toHaveClass('bg-cardapio-bg');
  });
});
