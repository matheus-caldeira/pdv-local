import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSidebarCollapsed } from './useSidebarCollapsed';

const KEY = 'meu-bolso:sidebar-collapsed';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSidebarCollapsed', () => {
  it('começa expandida quando nada foi salvo', () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    expect(result.current[0]).toBe(false);
  });

  it('recupera o estado recolhido salvo antes', () => {
    window.localStorage.setItem(KEY, 'true');

    const { result } = renderHook(() => useSidebarCollapsed());

    expect(result.current[0]).toBe(true);
  });

  it('persiste a escolha do usuário', () => {
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe('true');
  });

  it('volta a expandir e persiste', () => {
    window.localStorage.setItem(KEY, 'true');
    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => result.current[1](false));

    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('false');
  });

  it('assume expandida quando a leitura do storage falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderHook(() => useSidebarCollapsed());

    expect(result.current[0]).toBe(false);
  });

  it('mantém o estado em memória quando a escrita falha', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderHook(() => useSidebarCollapsed());

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
  });
});
