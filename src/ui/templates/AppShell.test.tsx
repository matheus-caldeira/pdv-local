import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ToastProvider } from '../molecules/Toast';
import { left, right } from '../../domain/shared/either';
import { AppError } from '../../domain/shared/errors';
import { formatTime } from '../../domain/shared/format';
import type { BusinessConfig } from '../../domain/config/config.entity';

const readConfig = vi.fn();
const useSessionMock = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    readConfig: () => readConfig(),
  },
}));

vi.mock('../hooks/useSession', () => ({
  useSession: () => useSessionMock(),
}));

class FakeError extends AppError {
  readonly code = 'FAKE';
  readonly layer = 'application' as const;
}

const BASE_CONFIG: BusinessConfig = {
  name: '',
  document: '',
  phone: '',
  address: '',
  ticketCounter: 0,
  ticketLimit: 0,
  ticketAutoReset: false,
  statusControlEnabled: false,
};

const ACTIVE_SESSION = {
  id: 1,
  openedAt: 1700000000000,
  closedAt: null,
  cashInitial: 0,
  cashFinal: null,
  notes: '',
};

function renderShell(initialEntries: string[] = ['/']) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<div>home page</div>} />
            <Route path="/pdv" element={<div>pdv page</div>} />
            <Route path="/products" element={<div>products page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    readConfig.mockReset();
    useSessionMock.mockReset();
    readConfig.mockResolvedValue(right(BASE_CONFIG));
    useSessionMock.mockReturnValue({ activeSession: null, loading: false });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the rail navigation and the outlet content', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Inicio/ }).length,
    ).toBeGreaterThan(0);
  });

  it('omits KDS and Painel when status control is disabled', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /KDS/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Painel/ }),
    ).not.toBeInTheDocument();
  });

  it('shows KDS and Painel when status control is enabled', async () => {
    readConfig.mockResolvedValue(
      right({ ...BASE_CONFIG, statusControlEnabled: true }),
    );
    renderShell();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /KDS/ })).toBeInTheDocument(),
    );
    expect(screen.getByRole('link', { name: /Painel/ })).toBeInTheDocument();
  });

  it('shows the active session indicator with the opening time on the rail', async () => {
    useSessionMock.mockReturnValue({
      activeSession: ACTIVE_SESSION,
      loading: false,
    });
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(
      screen.getByText(formatTime(ACTIVE_SESSION.openedAt)),
    ).toBeInTheDocument();
  });

  it('hides the session indicator when there is no active session', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(
      screen.queryByText(formatTime(ACTIVE_SESSION.openedAt)),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Sessao aberta desde/)).not.toBeInTheDocument();
  });

  it('skips the deferred sidebar close when unmounted before it runs', async () => {
    const { unmount } = renderShell();
    unmount();
    await Promise.resolve();
    await Promise.resolve();
    expect(
      screen.queryByRole('dialog', { name: 'Menu' }),
    ).not.toBeInTheDocument();
  });

  it('ignores a config resolution that arrives after unmount', async () => {
    let resolve: (
      value: ReturnType<typeof right<BusinessConfig>>,
    ) => void = () => {};
    readConfig.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    unmount();
    resolve(right({ ...BASE_CONFIG, statusControlEnabled: true }));
    await Promise.resolve();
    expect(screen.queryByRole('link', { name: /KDS/ })).not.toBeInTheDocument();
  });

  it('shows a toast when reading the config fails', async () => {
    readConfig.mockResolvedValue(left(new FakeError('falha config')));
    renderShell();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('falha config'),
    );
  });

  it('opens and closes the contact modal from the rail', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole('button', { name: 'Sobre e contato' }),
    );
    expect(screen.getByText('Matheus Caldeira')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    await waitFor(() =>
      expect(screen.queryByText('Matheus Caldeira')).not.toBeInTheDocument(),
    );
  });

  it('opens the mobile sidebar via "Mais" and closes it via the X button', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Menu' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes the sidebar when clicking the overlay backdrop', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));
    const overlay = screen.getByRole('presentation');
    await userEvent.click(overlay);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Menu' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows the session line and contact entry inside the sidebar', async () => {
    useSessionMock.mockReturnValue({
      activeSession: ACTIVE_SESSION,
      loading: false,
    });
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(dialog).getByText(/Sessao aberta desde/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Sobre e contato/ }),
    );
    expect(screen.getByText('Matheus Caldeira')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Menu' }),
    ).not.toBeInTheDocument();
  });

  it('closes the sidebar when navigating through a sidebar link', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: /Mais/ }));
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    await userEvent.click(within(dialog).getByRole('link', { name: /Vender/ }));
    await waitFor(() =>
      expect(screen.getByText('pdv page')).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Menu' }),
    ).not.toBeInTheDocument();
  });

  it('navigates through the bottom mobile tabs', async () => {
    renderShell();
    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    const tabs = screen.getAllByRole('link', { name: /Vender/ });
    await userEvent.click(tabs[tabs.length - 1]);
    await waitFor(() =>
      expect(screen.getByText('pdv page')).toBeInTheDocument(),
    );
  });
});
