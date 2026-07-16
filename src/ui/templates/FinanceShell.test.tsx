import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FinanceShell } from './FinanceShell';

const TAB_LABELS = [
  'Início',
  'Lançamentos',
  'Orçamento',
  'Automações',
  'Projeção',
  'Fechamentos',
  'Config',
];

function LocationProbe() {
  const location = useLocation();
  return (
    <output aria-label="URL atual">{`${location.pathname}${location.search}`}</output>
  );
}

function renderShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/finance" element={<FinanceShell />}>
          <Route index element={<div>dashboard content</div>} />
          <Route path="entries" element={<div>entries content</div>} />
          <Route path="budget" element={<div>budget content</div>} />
          <Route path="automations" element={<div>automations content</div>} />
          <Route path="projection" element={<div>projection content</div>} />
          <Route path="closings" element={<div>closings content</div>} />
          <Route path="settings" element={<div>settings content</div>} />
          <Route path="*" element={<div>unknown content</div>} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

function monthPicker() {
  return screen.queryByRole('group', { name: 'Seleção de mês' });
}

describe('FinanceShell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the seven tabs inside the finance navigation', () => {
    renderShell('/finance');
    const nav = screen.getByRole('navigation', {
      name: 'Seções do financeiro',
    });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(TAB_LABELS);
  });

  it('renders the outlet content of the active route', () => {
    renderShell('/finance/entries');
    expect(screen.getByText('entries content')).toBeInTheDocument();
  });

  it.each([
    ['/finance', 'dashboard content'],
    ['/finance/entries', 'entries content'],
    ['/finance/budget', 'budget content'],
    ['/finance/closings', 'closings content'],
  ])('shows the month picker at %s', (path, content) => {
    renderShell(`${path}?month=2026-03`);
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(monthPicker()).toBeInTheDocument();
    expect(screen.getByText('março de 2026')).toBeInTheDocument();
  });

  it.each([
    ['/finance/automations', 'automations content'],
    ['/finance/projection', 'projection content'],
    ['/finance/settings', 'settings content'],
  ])('hides the month picker at %s', (path, content) => {
    renderShell(`${path}?month=2026-03`);
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(monthPicker()).not.toBeInTheDocument();
  });

  it('hides the month picker on unknown subroutes', () => {
    renderShell('/finance/unknown?month=2026-03');
    expect(screen.getByText('unknown content')).toBeInTheDocument();
    expect(monthPicker()).not.toBeInTheDocument();
  });

  it('preserves the month param when navigating between tabs', async () => {
    renderShell('/finance?month=2026-03');
    await userEvent.click(screen.getByRole('link', { name: 'Automações' }));
    expect(screen.getByText('automations content')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'URL atual' })).toHaveTextContent(
      '/finance/automations?month=2026-03',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Lançamentos' }));
    expect(screen.getByText('março de 2026')).toBeInTheDocument();
  });

  it('falls back to the current month when the param is invalid', () => {
    renderShell('/finance?month=banana');
    const now = new Date();
    const expected = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(now.getFullYear(), now.getMonth(), 1));
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('defaults to the current month when the param is absent', () => {
    renderShell('/finance');
    expect(monthPicker()).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'URL atual' })).toHaveTextContent(
      /\/finance$/,
    );
  });

  it('updates the URL when changing the month through the picker', async () => {
    renderShell('/finance?month=2026-01');
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByText('fevereiro de 2026')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'URL atual' })).toHaveTextContent(
      '/finance?month=2026-02',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('janeiro de 2026')).toBeInTheDocument();
  });

  it('keeps the month chosen in the picker when visiting a tab without picker', async () => {
    renderShell('/finance?month=2026-06');
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await userEvent.click(screen.getByRole('link', { name: 'Config' }));
    expect(monthPicker()).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Orçamento' }));
    expect(screen.getByRole('status', { name: 'URL atual' })).toHaveTextContent(
      '/finance/budget?month=2026-07',
    );
    expect(screen.getByText('julho de 2026')).toBeInTheDocument();
  });
});
