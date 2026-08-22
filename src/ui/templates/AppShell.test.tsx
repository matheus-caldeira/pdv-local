import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { ToastProvider } from '../molecules/Toast';
import {
  buildNavModel,
  resolveActiveGroupId,
  type NavModel,
} from '../../app/nav-model';
import type { Session } from '../../domain/cash/cash.entity';

const bothModel = buildNavModel(['pdv', 'finance'], false);
const financeModel = buildNavModel(['finance'], false);

function renderShell(
  model: NavModel,
  initialEntry: string,
  activeSession: Session | null = null,
) {
  const activeGroupId = resolveActiveGroupId(initialEntry.split('?')[0], model);
  const bottomBar = model.groups.find((g) => g.id === activeGroupId)?.bar ?? [];
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={
              <AppShell
                model={model}
                activeGroupId={activeGroupId}
                bottomBar={bottomBar}
                activeSession={activeSession}
              />
            }
          >
            <Route path="*" element={<div>page content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('AppShell sidebar collapse', () => {
  it('starts expanded showing the brand and the labels', () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(sidebar).getByText('Meu Bolso')).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    ).toBeInTheDocument();
  });

  it('collapses the sidebar keeping the navigation reachable', async () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });

    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    );

    expect(within(sidebar).queryByText('Meu Bolso')).toBeNull();
    expect(
      within(sidebar).getByRole('link', { name: 'Vender' }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: 'Expandir menu' }),
    ).toBeInTheDocument();
  });

  it('expands again from the compact state', async () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });

    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    );
    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Expandir menu' }),
    );

    expect(within(sidebar).getByText('Meu Bolso')).toBeInTheDocument();
  });

  it('restores the collapsed choice on the next mount', async () => {
    const first = renderShell(bothModel, '/');
    await userEvent.click(
      screen.getByRole('button', { name: 'Recolher menu' }),
    );
    first.unmount();

    renderShell(bothModel, '/');

    expect(
      screen.getByRole('button', { name: 'Expandir menu' }),
    ).toBeInTheDocument();
  });

  it('highlights the compact home link on the home route', async () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });

    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    );

    expect(within(sidebar).getByRole('link', { name: 'Início' })).toHaveClass(
      'text-accent',
    );
  });

  it('leaves the compact home link unhighlighted off the home route', async () => {
    renderShell(bothModel, '/pdv');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });

    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    );

    expect(
      within(sidebar).getByRole('link', { name: 'Início' }),
    ).not.toHaveClass('text-accent');
  });

  it('hides the session hint text when collapsed', async () => {
    const session = { openedAt: Date.now() } as Session;
    renderShell(bothModel, '/', session);
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });

    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Recolher menu' }),
    );

    expect(within(sidebar).queryByText(/Caixa aberto desde/)).toBeNull();
  });
});

describe('AppShell sidebar', () => {
  it('renders the outlet content', () => {
    renderShell(bothModel, '/');
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('renders the loose home link and all group headers', () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(
      within(sidebar).getByRole('link', { name: 'Início' }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: 'Financeiro' }),
    ).toBeInTheDocument();
    expect(
      within(sidebar).getByRole('button', { name: 'Configurações' }),
    ).toBeInTheDocument();
  });

  it('expands only the group of the active route', () => {
    renderShell(bothModel, '/finance/entries');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(
      within(sidebar).getByRole('button', { name: 'Financeiro' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(sidebar).getByRole('button', { name: 'Ponto de Venda' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(sidebar).getByRole('link', { name: 'Lançamentos' }),
    ).toBeInTheDocument();
  });

  it('closes the previous group when another is toggled', async () => {
    renderShell(bothModel, '/finance');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Ponto de Venda' }),
    );
    expect(
      within(sidebar).getByRole('button', { name: 'Ponto de Venda' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(sidebar).getByRole('button', { name: 'Financeiro' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('omits home and pdv groups when only finance is enabled', () => {
    renderShell(financeModel, '/finance');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(sidebar).queryByRole('link', { name: 'Início' })).toBeNull();
    expect(within(sidebar).queryByText('Ponto de Venda')).toBeNull();
    expect(within(sidebar).getByText('Financeiro')).toBeInTheDocument();
    expect(
      within(sidebar).queryByRole('button', { name: 'Financeiro' }),
    ).toBeNull();
  });

  it('shows the open session hint', () => {
    renderShell(bothModel, '/', {
      uid: 's1',
      openedAt: new Date('2026-07-17T08:30:00').getTime(),
    } as Session);
    expect(screen.getAllByText(/08:30/).length).toBeGreaterThan(0);
  });

  it('navigates from the sidebar home link', async () => {
    renderShell(bothModel, '/finance');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    await userEvent.click(
      within(sidebar).getByRole('link', { name: 'Início' }),
    );
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('opens the contact modal from the sidebar footer', async () => {
    renderShell(bothModel, '/');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    await userEvent.click(
      within(sidebar).getByRole('button', { name: 'Sobre e contato' }),
    );
    expect(
      screen.getByRole('dialog', { name: /sobre|contato/i }),
    ).toBeInTheDocument();
  });

  it('re-expands the group synced to a new active route', () => {
    const activeGroupId = resolveActiveGroupId('/finance', bothModel);
    const bar = bothModel.groups.find((g) => g.id === activeGroupId)?.bar ?? [];
    const { rerender } = render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/finance']}>
          <Routes>
            <Route
              element={
                <AppShell
                  model={bothModel}
                  activeGroupId={activeGroupId}
                  bottomBar={bar}
                  activeSession={null}
                />
              }
            >
              <Route path="*" element={<div>page content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(
      within(sidebar).getByRole('button', { name: 'Financeiro' }),
    ).toHaveAttribute('aria-expanded', 'true');

    const nextGroupId = resolveActiveGroupId('/settings', bothModel);
    const nextBar =
      bothModel.groups.find((g) => g.id === nextGroupId)?.bar ?? [];
    rerender(
      <ToastProvider>
        <MemoryRouter initialEntries={['/finance']}>
          <Routes>
            <Route
              element={
                <AppShell
                  model={bothModel}
                  activeGroupId={nextGroupId}
                  bottomBar={nextBar}
                  activeSession={null}
                />
              }
            >
              <Route path="*" element={<div>page content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    expect(
      within(sidebar).getByRole('button', { name: 'Configurações' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(sidebar).getByRole('button', { name: 'Financeiro' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('ignores the drawer-close microtask after unmount', () => {
    const { unmount } = renderShell(bothModel, '/');
    unmount();
  });
});

describe('AppShell bottom bar', () => {
  it('renders the pdv bar with the modules slot at the root', () => {
    renderShell(bothModel, '/');
    const bar = screen.getByRole('navigation', { name: 'Menu do módulo' });
    expect(
      within(bar)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Início', 'Vender', 'Pedidos', 'Caixa']);
    expect(
      within(bar).getByRole('button', { name: 'Módulos' }),
    ).toBeInTheDocument();
  });

  it('renders the finance bar on finance routes', () => {
    renderShell(bothModel, '/finance/budget');
    const bar = screen.getByRole('navigation', { name: 'Menu do módulo' });
    expect(
      within(bar)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Resumo', 'Lançamentos', 'Orçamento', 'Fechamentos']);
  });

  it('preserves the month search between finance links', () => {
    renderShell(bothModel, '/finance?month=2026-03');
    const bar = screen.getByRole('navigation', { name: 'Menu do módulo' });
    expect(
      within(bar).getByRole('link', { name: 'Orçamento' }),
    ).toHaveAttribute('href', '/finance/budget?month=2026-03');
  });

  it('drops the month search outside finance', () => {
    renderShell(bothModel, '/finance?month=2026-03');
    const sidebar = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(
      within(sidebar).getByRole('link', { name: 'Início' }),
    ).toHaveAttribute('href', '/');
  });
});

describe('AppShell modules drawer', () => {
  it('opens the drawer with the accordion groups and active module expanded', async () => {
    renderShell(bothModel, '/finance');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    expect(
      within(drawer).getByRole('button', { name: 'Financeiro' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(drawer).getByRole('link', { name: 'Automações' }),
    ).toBeInTheDocument();
  });

  it('closes the drawer after navigating', async () => {
    renderShell(bothModel, '/finance');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    await userEvent.click(
      within(drawer).getByRole('link', { name: 'Automações' }),
    );
    expect(screen.queryByRole('dialog', { name: 'Módulos' })).toBeNull();
  });

  it('opens the contact modal from the about action', async () => {
    renderShell(bothModel, '/settings');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Configurações' }),
    );
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Sobre e contato' }),
    );
    expect(
      screen.getByRole('dialog', { name: /sobre|contato/i }),
    ).toBeInTheDocument();
  });

  it('closes the contact modal on escape', async () => {
    renderShell(bothModel, '/settings');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Sobre e contato' }),
    );
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /sobre|contato/i })).toBeNull();
  });

  it('closes the drawer by clicking the backdrop', async () => {
    renderShell(bothModel, '/');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    expect(screen.getByRole('dialog', { name: 'Módulos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('dialog', { name: 'Módulos' })).toBeNull();
  });

  it('closes the drawer with the close button', async () => {
    renderShell(bothModel, '/');
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Fechar menu' }),
    );
    expect(screen.queryByRole('dialog', { name: 'Módulos' })).toBeNull();
  });

  it('shows the open session hint inside the drawer', async () => {
    renderShell(bothModel, '/', {
      uid: 's1',
      openedAt: new Date('2026-07-17T08:30:00').getTime(),
    } as Session);
    await userEvent.click(screen.getByRole('button', { name: 'Módulos' }));
    const drawer = screen.getByRole('dialog', { name: 'Módulos' });
    expect(within(drawer).getByText(/08:30/)).toBeInTheDocument();
  });

  it('publica a altura real da barra de navegação', () => {
    const { unmount } = renderShell(bothModel, '/');

    expect(
      document.documentElement.style.getPropertyValue('--bottom-nav-h'),
    ).toMatch(/^\d+px$/);

    unmount();

    expect(
      document.documentElement.style.getPropertyValue('--bottom-nav-h'),
    ).toBe('');
  });
});
