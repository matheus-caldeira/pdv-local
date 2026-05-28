import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useTicketSuggestion } from './useTicketSuggestion';

const configGet = vi.fn();

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({ config: { get: configGet } }),
}));

function Probe() {
  const { suggestion, refresh } = useTicketSuggestion();
  return (
    <div>
      <span>ticket:{suggestion}</span>
      <button type="button" onClick={() => refresh()}>
        refresh
      </button>
    </div>
  );
}

describe('useTicketSuggestion', () => {
  beforeEach(() => {
    configGet.mockReset();
  });
  afterEach(cleanup);

  it('formats the stored counter against the limit', async () => {
    configGet.mockResolvedValue({ ticketCounter: 7, ticketLimit: 9999 });
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0007')).toBeInTheDocument(),
    );
  });

  it('falls back to defaults when config is missing', async () => {
    configGet.mockResolvedValue(undefined);
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0001')).toBeInTheDocument(),
    );
  });

  it('refreshes on demand', async () => {
    configGet.mockResolvedValueOnce({ ticketCounter: 1, ticketLimit: 9999 });
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0001')).toBeInTheDocument(),
    );
    configGet.mockResolvedValueOnce({ ticketCounter: 2, ticketLimit: 9999 });
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await waitFor(() =>
      expect(screen.getByText('ticket:0002')).toBeInTheDocument(),
    );
  });

  it('ignores a late initial resolution after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    configGet.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve({ ticketCounter: 3, ticketLimit: 9999 });
    await Promise.resolve();
    expect(screen.queryByText('ticket:0003')).not.toBeInTheDocument();
  });
});
