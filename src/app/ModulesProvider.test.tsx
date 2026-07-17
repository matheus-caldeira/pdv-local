import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { ModulesProvider, useModules } from './ModulesProvider';
import { ToastProvider } from '../ui/molecules/Toast';
import { left, right } from '../domain/shared/either';
import { AppError } from '../domain/shared/errors';

const resolveModulesState = vi.fn();

vi.mock('./container', () => ({
  container: {
    resolveModulesState: () => resolveModulesState(),
  },
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

let captured: ReturnType<typeof useModules>;

function Probe() {
  captured = useModules();
  return (
    <output aria-label="Estado">{`${captured.status}:${captured.modules.join(',')}:${captured.needsFirstRun}`}</output>
  );
}

function renderProvider() {
  return render(
    <ToastProvider>
      <ModulesProvider>
        <Probe />
      </ModulesProvider>
    </ToastProvider>,
  );
}

describe('ModulesProvider', () => {
  beforeEach(() => {
    resolveModulesState.mockReset();
  });
  afterEach(cleanup);

  it('starts loading and exposes the resolved modules', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: ['finance'], needsFirstRun: false }),
    );
    renderProvider();
    expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
      'loading::false',
    );
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
        'ready:finance:false',
      ),
    );
  });

  it('exposes needsFirstRun on a fresh install', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: [], needsFirstRun: true }),
    );
    renderProvider();
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
        'ready::true',
      ),
    );
  });

  it('toasts and falls back to pdv on failure', async () => {
    resolveModulesState.mockResolvedValue(left(new FakeError('deu ruim')));
    renderProvider();
    expect(await screen.findByText('deu ruim')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
      'ready:pdv:false',
    );
  });

  it('re-resolves the state on refresh', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: ['pdv'], needsFirstRun: false }),
    );
    renderProvider();
    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
        'ready:pdv:false',
      ),
    );
    resolveModulesState.mockResolvedValue(
      right({ modules: ['pdv', 'finance'], needsFirstRun: false }),
    );
    await act(() => captured.refresh());
    expect(screen.getByRole('status', { name: 'Estado' })).toHaveTextContent(
      'ready:pdv,finance:false',
    );
  });

  it('throws when useModules is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow();
    spy.mockRestore();
  });
});
