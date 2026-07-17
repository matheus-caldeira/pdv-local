import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { AppRoutes } from './App';
import { ToastProvider } from './ui/molecules/Toast';
import { MemoryRouter } from 'react-router-dom';
import { ModulesProvider } from './app/ModulesProvider';
import { right } from './domain/shared/either';

const resolveModulesState = vi.fn();

vi.mock('./app/container', () => ({
  container: {
    resolveModulesState: () => resolveModulesState(),
    readConfig: () =>
      Promise.resolve(
        right({
          statusControlEnabled: false,
          enabledModules: [],
          businessTypeId: '',
          extra: {},
          name: '',
          document: '',
          phone: '',
          address: '',
          ticketCounter: 1,
          ticketLimit: 9999,
          ticketAutoReset: true,
        }),
      ),
    getActiveSession: () => Promise.resolve(right(undefined)),
    ensureFinanceDefaults: () => Promise.resolve(right(undefined)),
    completeFirstRun: () => Promise.resolve(right(['pdv'])),
  },
}));

function renderApp(initialEntry: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <ModulesProvider>
          <AppRoutes />
        </ModulesProvider>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    resolveModulesState.mockReset();
  });
  afterEach(cleanup);

  it('shows the onboarding on a fresh install', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: [], needsFirstRun: true }),
    );
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'O que você quer usar?' }),
    ).toBeInTheDocument();
  });

  it('redirects the root to finance when only finance is enabled', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: ['finance'], needsFirstRun: false }),
    );
    renderApp('/');
    const sidebar = await screen.findByRole('navigation', {
      name: 'Menu principal',
    });
    expect(
      within(sidebar).getByRole('link', { name: 'Lançamentos' }),
    ).toBeInTheDocument();
  });

  it('redirects pdv routes to the root when pdv is disabled', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: ['finance'], needsFirstRun: false }),
    );
    renderApp('/pdv');
    expect(
      await screen.findByRole('navigation', { name: 'Menu principal' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Vender' })).toBeNull();
  });

  it('redirects finance routes to the root when finance is disabled', async () => {
    resolveModulesState.mockResolvedValue(
      right({ modules: ['pdv'], needsFirstRun: false }),
    );
    renderApp('/finance/entries');
    const sidebar = await screen.findByRole('navigation', {
      name: 'Menu principal',
    });
    expect(
      within(sidebar).queryByRole('link', { name: 'Lançamentos' }),
    ).toBeNull();
    expect(
      within(sidebar).getByRole('link', { name: 'Início' }),
    ).toBeInTheDocument();
  });
});
