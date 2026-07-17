import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShellRoute } from './AppShellRoute';
import { ToastProvider } from '../ui/molecules/Toast';

const useModules = vi.fn();
const useSession = vi.fn();
const useStatusControl = vi.fn();

vi.mock('./modules-context', () => ({
  useModules: () => useModules(),
}));

vi.mock('../ui/hooks/useSession', () => ({
  useSession: () => useSession(),
}));

vi.mock('../ui/hooks/useStatusControl', () => ({
  useStatusControl: (dependencyKey: string) => useStatusControl(dependencyKey),
}));

function renderAt(initialEntry: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AppShellRoute />}>
            <Route path="/" element={<div>Início</div>} />
            <Route path="/pdv" element={<div>Vender</div>} />
            <Route path="/finance" element={<div>Financeiro</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('AppShellRoute', () => {
  afterEach(cleanup);

  it('renders the sidebar and the module bottom bar for pdv', () => {
    useModules.mockReturnValue({ modules: ['pdv', 'finance'] });
    useSession.mockReturnValue({ activeSession: null });
    useStatusControl.mockReturnValue(false);

    renderAt('/pdv');

    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(
      within(sidebar).getByRole('link', { name: 'Vender' }),
    ).toBeInTheDocument();

    const bottomBar = screen.getByRole('navigation', {
      name: 'Menu do módulo',
    });
    expect(
      within(bottomBar).getByRole('link', { name: 'Caixa' }),
    ).toBeInTheDocument();
  });

  it('renders the finance bottom bar when the active group is finance', () => {
    useModules.mockReturnValue({ modules: ['pdv', 'finance'] });
    useSession.mockReturnValue({ activeSession: null });
    useStatusControl.mockReturnValue(false);

    renderAt('/finance');

    const bottomBar = screen.getByRole('navigation', {
      name: 'Menu do módulo',
    });
    expect(
      within(bottomBar).getByRole('link', { name: 'Fechamentos' }),
    ).toBeInTheDocument();
  });
});
