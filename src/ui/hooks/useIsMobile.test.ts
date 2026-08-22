import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { useIsMobile } from './useIsMobile';

const readConfig = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    readConfig: () => readConfig(),
  },
}));

interface FakeQuery {
  matches: boolean;
  listeners: ((event: { matches: boolean }) => void)[];
}

function stubMatchMedia(matches: boolean): FakeQuery {
  const query: FakeQuery = { matches, listeners: [] };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return query.matches;
      },
      addEventListener: (
        _: string,
        handler: (e: { matches: boolean }) => void,
      ) => query.listeners.push(handler),
      removeEventListener: (
        _: string,
        handler: (e: { matches: boolean }) => void,
      ) => {
        query.listeners = query.listeners.filter((entry) => entry !== handler);
      },
    })),
  );
  return query;
}

function configWith(layoutMode: string) {
  return right({ layoutMode });
}

afterEach(() => {
  cleanup();
  readConfig.mockReset();
  vi.unstubAllGlobals();
});

describe('useIsMobile', () => {
  it('segue o matchMedia no modo automático', async () => {
    stubMatchMedia(true);
    readConfig.mockResolvedValue(configWith('auto'));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('devolve desktop no automático quando a tela é larga', async () => {
    stubMatchMedia(false);
    readConfig.mockResolvedValue(configWith('auto'));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('força celular mesmo com tela larga', async () => {
    stubMatchMedia(false);
    readConfig.mockResolvedValue(configWith('mobile'));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('força computador mesmo com tela estreita', async () => {
    stubMatchMedia(true);
    readConfig.mockResolvedValue(configWith('desktop'));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('reage ao redimensionamento no modo automático', async () => {
    const query = stubMatchMedia(false);
    readConfig.mockResolvedValue(configWith('auto'));

    const { result } = renderHook(() => useIsMobile());
    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      query.matches = true;
      query.listeners.forEach((handler) => handler({ matches: true }));
    });

    expect(result.current).toBe(true);
  });

  it('assume computador quando a config falha', async () => {
    stubMatchMedia(true);
    readConfig.mockResolvedValue(left(new Error('falhou')));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });

  it('assume computador quando não há matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined);
    readConfig.mockResolvedValue(configWith('auto'));

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(readConfig).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});
