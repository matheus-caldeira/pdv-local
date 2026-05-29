import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useSession } from './useSession';

const sessionsToArray = vi.fn();

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({ sessions: { toArray: sessionsToArray } }),
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
    sessionsToArray.mockReset();
  });
  afterEach(cleanup);

  it('returns the open session (closedAt null)', async () => {
    sessionsToArray.mockResolvedValue([
      { id: 1, closedAt: 123 },
      { id: 2, closedAt: null },
    ]);
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('loading:false')).toBeInTheDocument(),
    );
    expect(screen.getByText('session:2')).toBeInTheDocument();
  });

  it('returns null when no open session exists', async () => {
    sessionsToArray.mockResolvedValue([{ id: 1, closedAt: 999 }]);
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('loading:false')).toBeInTheDocument(),
    );
    expect(screen.getByText('session:none')).toBeInTheDocument();
  });

  it('ignores a late resolution after unmount', async () => {
    let resolve: (value: unknown[]) => void = () => {};
    sessionsToArray.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve([{ id: 5, closedAt: null }]);
    await Promise.resolve();
    expect(screen.queryByText('session:5')).not.toBeInTheDocument();
  });
});
