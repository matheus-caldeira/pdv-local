import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStoredStageSet } from './useStoredStageSet';

const KEY = 'meu-bolso:test-stages';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('useStoredStageSet', () => {
  it('começa vazio quando nada foi salvo', () => {
    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.has('aceito')).toBe(false);
  });

  it('recupera as etapas salvas antes', () => {
    window.localStorage.setItem(KEY, '["finalizado"]');

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.has('finalizado')).toBe(true);
    expect(result.current.has('aceito')).toBe(false);
  });

  it('adiciona uma etapa e persiste', () => {
    const { result } = renderHook(() => useStoredStageSet(KEY));

    act(() => result.current.toggle('em_preparo'));

    expect(result.current.has('em_preparo')).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBe('["em_preparo"]');
  });

  it('remove uma etapa já presente', () => {
    window.localStorage.setItem(KEY, '["finalizado"]');
    const { result } = renderHook(() => useStoredStageSet(KEY));

    act(() => result.current.toggle('finalizado'));

    expect(result.current.has('finalizado')).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('[]');
  });

  it('mantém as demais etapas ao alternar outra', () => {
    window.localStorage.setItem(KEY, '["aceito"]');
    const { result } = renderHook(() => useStoredStageSet(KEY));

    act(() => result.current.toggle('finalizado'));

    expect(result.current.has('aceito')).toBe(true);
    expect(result.current.has('finalizado')).toBe(true);
  });

  it('expõe a lista de etapas guardadas', () => {
    window.localStorage.setItem(KEY, '["aceito","a_caminho"]');

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.stages).toEqual(['aceito', 'a_caminho']);
  });

  it('ignora um conteúdo inválido no armazenamento', () => {
    window.localStorage.setItem(KEY, 'nada disso é json');

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.stages).toEqual([]);
  });

  it('ignora um json que não seja lista', () => {
    window.localStorage.setItem(KEY, '{"finalizado":true}');

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.stages).toEqual([]);
  });

  it('descarta valores que não são etapas conhecidas', () => {
    window.localStorage.setItem(KEY, '["aceito","inventada"]');

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.stages).toEqual(['aceito']);
  });

  it('assume vazio quando a leitura falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    const { result } = renderHook(() => useStoredStageSet(KEY));

    expect(result.current.stages).toEqual([]);
  });

  it('mantém o estado em memória quando a escrita falha', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useStoredStageSet(KEY));

    act(() => result.current.toggle('aceito'));

    expect(result.current.has('aceito')).toBe(true);
  });
});
