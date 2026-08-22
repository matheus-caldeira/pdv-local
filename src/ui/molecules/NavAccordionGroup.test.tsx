import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavAccordionGroup } from './NavAccordionGroup';
import { buildNavModel } from '../../app/nav-model';

const model = buildNavModel(['pdv', 'finance'], false);
const financeGroup = model.groups.find((g) => g.id === 'finance')!;
const settingsGroup = model.groups.find((g) => g.id === 'settings')!;
const fixedFinance = buildNavModel(['finance'], false).groups[0];

function renderGroup(
  group = financeGroup,
  over: Partial<Parameters<typeof NavAccordionGroup>[0]> = {},
) {
  const onToggle = vi.fn();
  const onNavigate = vi.fn();
  const onAction = vi.fn();
  render(
    <MemoryRouter>
      <NavAccordionGroup
        group={group}
        expanded={false}
        onToggle={onToggle}
        searchFor={() => ''}
        onNavigate={onNavigate}
        onAction={onAction}
        {...over}
      />
    </MemoryRouter>,
  );
  return { onToggle, onNavigate, onAction };
}

afterEach(cleanup);

describe('NavAccordionGroup', () => {
  it('renders a collapsed header without items', () => {
    renderGroup();
    const header = screen.getByRole('button', { name: 'Financeiro' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Lançamentos' })).toBeNull();
  });

  it('shows the items when expanded', () => {
    renderGroup(financeGroup, { expanded: true });
    expect(screen.getByRole('button', { name: 'Financeiro' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('link', { name: 'Lançamentos' })).toHaveAttribute(
      'href',
      '/finance/entries',
    );
  });

  it('notifies the toggle with the group id', async () => {
    const { onToggle } = renderGroup();
    await userEvent.click(screen.getByRole('button', { name: 'Financeiro' }));
    expect(onToggle).toHaveBeenCalledWith('finance');
  });

  it('appends the search returned by searchFor to the links', () => {
    renderGroup(financeGroup, {
      expanded: true,
      searchFor: () => '?month=2026-03',
    });
    expect(screen.getByRole('link', { name: 'Orçamento' })).toHaveAttribute(
      'href',
      '/finance/budget?month=2026-03',
    );
  });

  it('notifies navigation when a link is clicked', async () => {
    const { onNavigate } = renderGroup(financeGroup, { expanded: true });
    await userEvent.click(screen.getByRole('link', { name: 'Resumo' }));
    expect(onNavigate).toHaveBeenCalled();
  });

  it('renders action items as buttons and notifies the action', async () => {
    const { onAction } = renderGroup(settingsGroup, { expanded: true });
    await userEvent.click(
      screen.getByRole('button', { name: 'Sobre e contato' }),
    );
    expect(onAction).toHaveBeenCalledWith('about');
  });

  it('renders a fixed group without a toggle button', () => {
    renderGroup(fixedFinance);
    expect(screen.queryByRole('button', { name: 'Financeiro' })).toBeNull();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Lançamentos' }),
    ).toBeInTheDocument();
  });

  it('keeps the accessible name of the collapsed header when compact', () => {
    renderGroup(financeGroup, { compact: true });
    expect(
      screen.getByRole('button', { name: 'Financeiro' }),
    ).toBeInTheDocument();
  });

  it('shows the items of the expanded group when compact', () => {
    renderGroup(financeGroup, { compact: true, expanded: true });
    expect(screen.getByRole('link', { name: 'Resumo' })).toBeInTheDocument();
  });

  it('titles the compact items so the hover reveals the label', () => {
    renderGroup(financeGroup, { compact: true, expanded: true });
    expect(screen.getByRole('link', { name: 'Resumo' })).toHaveAttribute(
      'title',
      'Resumo',
    );
  });

  it('titles compact action items too', () => {
    renderGroup(settingsGroup, { compact: true, expanded: true });
    expect(
      screen.getByRole('button', { name: 'Sobre e contato' }),
    ).toHaveAttribute('title', 'Sobre e contato');
  });

  it('renders a compact fixed group without repeating the label as text', () => {
    renderGroup(fixedFinance, { compact: true });
    expect(screen.queryByText('Financeiro')).toBeNull();
    expect(screen.getByRole('link', { name: 'Resumo' })).toBeInTheDocument();
  });
});
