import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DocsSearch } from './DocsSearch';

vi.mock('../hooks/useDocsSearch', () => ({
  useDocsSearch: () => ({
    ready: true,
    search: (q: string) =>
      q.includes('caix')
        ? [
            {
              slug: 'caixa',
              title: 'Caixa',
              section: 'No dia a dia',
              heading: 'Fechar o caixa',
              anchor: 'fechar-o-caixa',
              snippet: 'feche o caixa',
              score: 3,
            },
            {
              slug: 'overview',
              title: 'Overview',
              section: 'Começar',
              heading: null,
              anchor: null,
              snippet: 'sem âncora',
              score: 1,
            },
          ]
        : [],
  }),
}));

describe('DocsSearch', () => {
  afterEach(cleanup);

  it('mostra resultados ao digitar e fecha no Esc', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <DocsSearch open onClose={onClose} />
      </MemoryRouter>,
    );
    const input = screen.getByRole('searchbox', { name: /buscar/i });
    await userEvent.type(input, 'caix');
    const link = screen.getByRole('link', { name: /Caixa/ });
    expect(link.getAttribute('href')).toContain('/caixa#fechar-o-caixa');
    const noAnchor = screen.getByRole('link', { name: /Overview/ });
    expect(noAnchor.getAttribute('href')).toMatch(/\/overview$/);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra "nada encontrado" quando não há resultado', async () => {
    render(
      <MemoryRouter>
        <DocsSearch open onClose={() => {}} />
      </MemoryRouter>,
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: /buscar/i }),
      'zzz',
    );
    expect(screen.getByText(/Nada encontrado/)).toBeInTheDocument();
  });

  it('fecha ao clicar fora e não fecha ao clicar dentro', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <DocsSearch open onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não renderiza quando fechado', () => {
    render(
      <MemoryRouter>
        <DocsSearch open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
