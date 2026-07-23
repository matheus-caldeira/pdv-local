import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocsSearchPage } from './DocsSearchPage';

vi.mock('../../ui/hooks/useDocsSearch', () => ({
  useDocsSearch: () => ({
    ready: true,
    search: (q: string) =>
      q === 'caixa'
        ? [
            {
              slug: 'caixa',
              title: 'Caixa',
              section: 'No dia a dia',
              heading: 'Abrir o caixa',
              anchor: 'abrir-o-caixa',
              snippet: 'abra o caixa',
              score: 3,
            },
            {
              slug: 'overview',
              title: 'Overview',
              section: 'Começar',
              heading: null,
              anchor: null,
              snippet: 'dinheiro do dia',
              score: 1,
            },
          ]
        : [],
  }),
}));

describe('DocsSearchPage', () => {
  afterEach(cleanup);

  it('lista resultados de ?q=', () => {
    render(
      <MemoryRouter initialEntries={['/busca?q=caixa']}>
        <DocsSearchPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Caixa › Abrir o caixa/ }),
    ).toHaveAttribute('href', expect.stringContaining('/caixa#abrir-o-caixa'));
    const noAnchor = screen.getByRole('link', { name: /Overview/ });
    expect(noAnchor.getAttribute('href')).toMatch(/\/overview$/);
  });

  it('mostra ajuda sem query', () => {
    render(
      <MemoryRouter initialEntries={['/busca']}>
        <DocsSearchPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Digite algo para buscar/)).toBeInTheDocument();
  });

  it('mostra "nada encontrado" quando a query não casa', () => {
    render(
      <MemoryRouter initialEntries={['/busca?q=zzz']}>
        <DocsSearchPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nada encontrado para/)).toBeInTheDocument();
  });
});
