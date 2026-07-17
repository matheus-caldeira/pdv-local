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

afterEach(cleanup);

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
});
