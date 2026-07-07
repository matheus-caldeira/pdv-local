import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useSession } from './useSession';

const getActiveSession = vi.fn();

vi.mock('../../app/container', () => ({
  container: { getActiveSession: () => getActiveSession() },
}));

function Probe() {
  const { activeSession, loading } = useSession();
  return (
    <div>
      <span>loading:{String(loading)}</span>
      <span>session:{activeSession ? activeSession.id : 'none'}</span>
    </div>
  );
}

describe('useSession', () => {
  beforeEach(() => {
    getActiveSession.mockReset();
  });
  afterEach(cleanup);

  it('returns the open session', async () => {
    getActiveSession.mockResolvedValue(right({ id: 2, closedAt: null }));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('loading:false')).toBeInTheDocument(),
    );
    expect(screen.getByText('session:2')).toBeInTheDocument();
  });

  it('returns null when no open session exists', async () => {
    getActiveSession.mockResolvedValue(right(null));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('loading:false')).toBeInTheDocument(),
    );
    expect(screen.getByText('session:none')).toBeInTheDocument();
  });

  it('returns null when the use case fails', async () => {
    getActiveSession.mockResolvedValue(left(new ConnectorError('x')));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('loading:false')).toBeInTheDocument(),
    );
    expect(screen.getByText('session:none')).toBeInTheDocument();
  });

  it('ignores a late resolution after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    getActiveSession.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve(right({ id: 5, closedAt: null }));
    await Promise.resolve();
    expect(screen.queryByText('session:5')).not.toBeInTheDocument();
  });
});
