import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DocsPage } from './DocsPage';
import { FIRST_DOC_SLUG } from '../../../docs/guide/manifest';

describe('DocsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renderiza o markdown com links internos como rota', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('# Caixa\n\nVeja [Venda](venda).'),
      }),
    );
    render(
      <MemoryRouter>
        <DocsPage slug="caixa" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Caixa' }),
      ).toBeInTheDocument(),
    );
    const link = screen.getByRole('link', { name: 'Venda' });
    expect(link.getAttribute('href')).toContain('/venda');
  });

  it('mantém links externos como <a> normal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('[site](https://exemplo.com)'),
      }),
    );
    render(
      <MemoryRouter>
        <DocsPage slug="x" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute(
        'href',
        'https://exemplo.com',
      ),
    );
  });

  it('mostra erro quando o fetch falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('') }),
    );
    render(
      <MemoryRouter>
        <DocsPage slug="inexistente" />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Não encontramos esta página/),
      ).toBeInTheDocument(),
    );
  });

  it('usa o slug da rota quando não recebe prop', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Rota'),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/produtos']}>
        <Routes>
          <Route path=":slug" element={<DocsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/produtos.md'),
      ),
    );
  });

  it('cai no primeiro slug quando não há prop nem rota', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Início'),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <DocsPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/${FIRST_DOC_SLUG}.md`),
      ),
    );
  });

  it('ignora a resposta se desmontar antes do fetch resolver', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const { unmount } = render(
      <MemoryRouter>
        <DocsPage slug="caixa" />
      </MemoryRouter>,
    );
    unmount();
    resolveFetch({ ok: true, text: () => Promise.resolve('# Tarde demais') });
    await Promise.resolve();
    expect(screen.queryByText('Tarde demais')).not.toBeInTheDocument();
  });

  it('ignora o erro se desmontar antes do fetch falhar', async () => {
    let rejectFetch: (e: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectFetch = reject;
          }),
      ),
    );
    const { unmount } = render(
      <MemoryRouter>
        <DocsPage slug="caixa" />
      </MemoryRouter>,
    );
    unmount();
    rejectFetch(new Error('x'));
    await Promise.resolve();
    expect(
      screen.queryByText(/Não encontramos esta página/),
    ).not.toBeInTheDocument();
  });
});
