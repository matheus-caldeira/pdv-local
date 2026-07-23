import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useDocsSearch } from './useDocsSearch';

const index = [
  {
    slug: 'caixa',
    title: 'Caixa',
    section: 'No dia a dia',
    heading: null,
    anchor: null,
    text: 'dinheiro do dia',
  },
];

describe('useDocsSearch', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('carrega o índice e busca', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(index),
      }),
    );
    const { result } = renderHook(() => useDocsSearch());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.search('caixa')[0].slug).toBe('caixa');
  });

  it('retorna vazio antes de carregar e em erro de rede', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
    const { result } = renderHook(() => useDocsSearch());
    expect(result.current.search('caixa')).toEqual([]);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.search('caixa')).toEqual([]);
  });

  it('trata resposta não-ok como índice vazio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve([]) }),
    );
    const { result } = renderHook(() => useDocsSearch());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.search('caixa')).toEqual([]);
  });

  it('ignora o resultado se desmontar antes do fetch resolver', async () => {
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
    const { result, unmount } = renderHook(() => useDocsSearch());
    unmount();
    resolveFetch({ ok: true, json: () => Promise.resolve(index) });
    await Promise.resolve();
    expect(result.current.ready).toBe(false);
  });

  it('ignora a rejeição se desmontar antes do fetch falhar', async () => {
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
    const { result, unmount } = renderHook(() => useDocsSearch());
    unmount();
    rejectFetch(new Error('x'));
    await Promise.resolve();
    expect(result.current.ready).toBe(false);
  });
});
