import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useTicketSuggestion } from './useTicketSuggestion';

const peekTicketSuggestion = vi.fn();

vi.mock('../../app/container', () => ({
  container: { peekTicketSuggestion: () => peekTicketSuggestion() },
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
    peekTicketSuggestion.mockReset();
  });
  afterEach(cleanup);

  it('shows the suggestion returned by the use case', async () => {
    peekTicketSuggestion.mockResolvedValue(right('0007'));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0007')).toBeInTheDocument(),
    );
  });

  it('shows an empty suggestion on failure', async () => {
    peekTicketSuggestion.mockResolvedValue(left(new ConnectorError('x')));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:')).toBeInTheDocument(),
    );
  });

  it('refreshes on demand', async () => {
    peekTicketSuggestion.mockResolvedValueOnce(right('0001'));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0001')).toBeInTheDocument(),
    );
    peekTicketSuggestion.mockResolvedValueOnce(right('0002'));
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await waitFor(() =>
      expect(screen.getByText('ticket:0002')).toBeInTheDocument(),
    );
  });

  it('clears the suggestion when refresh fails', async () => {
    peekTicketSuggestion.mockResolvedValueOnce(right('0005'));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('ticket:0005')).toBeInTheDocument(),
    );
    peekTicketSuggestion.mockResolvedValueOnce(left(new ConnectorError('x')));
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await waitFor(() =>
      expect(screen.getByText('ticket:')).toBeInTheDocument(),
    );
  });

  it('ignores a late initial resolution after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    peekTicketSuggestion.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve(right('0003'));
    await Promise.resolve();
    expect(screen.queryByText('ticket:0003')).not.toBeInTheDocument();
  });
});
