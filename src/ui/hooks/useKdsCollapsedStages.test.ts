import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useKdsCollapsedStages } from './useKdsCollapsedStages';

const KEY = 'meu-bolso:kds-collapsed-stages';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('useKdsCollapsedStages', () => {
  it('começa com todas as etapas abertas', () => {
    const { result } = renderHook(() => useKdsCollapsedStages());

    expect(result.current.isCollapsed('aceito')).toBe(false);
    expect(result.current.isCollapsed('finalizado')).toBe(false);
  });

  it('recupera as etapas minimizadas salvas antes', () => {
    window.localStorage.setItem(KEY, '["finalizado"]');

    const { result } = renderHook(() => useKdsCollapsedStages());

    expect(result.current.isCollapsed('finalizado')).toBe(true);
    expect(result.current.isCollapsed('aceito')).toBe(false);
  });

  it('minimiza uma etapa e persiste', () => {
    const { result } = renderHook(() => useKdsCollapsedStages());

    act(() => result.current.toggle('em_preparo'));

    expect(result.current.isCollapsed('em_preparo')).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe('["em_preparo"]');
  });

  it('restaura uma etapa minimizada', () => {
    window.localStorage.setItem(KEY, '["finalizado"]');
    const { result } = renderHook(() => useKdsCollapsedStages());

    act(() => result.current.toggle('finalizado'));

    expect(result.current.isCollapsed('finalizado')).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('[]');
  });

  it('mantém as demais etapas ao minimizar outra', () => {
    window.localStorage.setItem(KEY, '["aceito"]');
    const { result } = renderHook(() => useKdsCollapsedStages());

    act(() => result.current.toggle('finalizado'));

    expect(result.current.isCollapsed('aceito')).toBe(true);
    expect(result.current.isCollapsed('finalizado')).toBe(true);
  });

  it('ignora um conteúdo inválido no armazenamento', () => {
    window.localStorage.setItem(KEY, 'nada disso é json');

    const { result } = renderHook(() => useKdsCollapsedStages());

    expect(result.current.isCollapsed('aceito')).toBe(false);
  });

  it('ignora um json que não seja lista de etapas', () => {
    window.localStorage.setItem(KEY, '{"finalizado":true}');

    const { result } = renderHook(() => useKdsCollapsedStages());

    expect(result.current.isCollapsed('finalizado')).toBe(false);
  });

  it('assume tudo aberto quando a leitura falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderHook(() => useKdsCollapsedStages());

    expect(result.current.isCollapsed('aceito')).toBe(false);
  });

  it('mantém o estado em memória quando a escrita falha', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useKdsCollapsedStages());

    act(() => result.current.toggle('aceito'));

    expect(result.current.isCollapsed('aceito')).toBe(true);
  });
});
