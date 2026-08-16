import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, act, waitFor } from '@testing-library/react';
import { useAppUpdate } from './useAppUpdate';

const registerSW = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: {
    onNeedRefresh?: () => void;
    onRegisteredSW?: (
      url: string,
      registration: { update: () => void } | undefined,
    ) => void;
  }) => {
    registerSW(options);
    return vi.fn();
  },
}));

describe('useAppUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('começa sem atualização disponível', () => {
    const { result } = renderHook(() => useAppUpdate());
    expect(result.current.updateAvailable).toBe(false);
  });

  it('sinaliza quando há versão nova esperando', async () => {
    const { result } = renderHook(() => useAppUpdate());

    const options = registerSW.mock.calls[0][0];
    act(() => options.onNeedRefresh());

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
  });

  it('aplica a atualização chamando o updater', async () => {
    const { result } = renderHook(() => useAppUpdate());

    const options = registerSW.mock.calls[0][0];
    act(() => options.onNeedRefresh());
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    act(() => result.current.applyUpdate());

    expect(result.current.updateAvailable).toBe(false);
  });

  it('não agenda verificação quando o registro não está disponível', () => {
    renderHook(() => useAppUpdate());

    const options = registerSW.mock.calls[0][0];
    expect(() => options.onRegisteredSW('/sw.js', undefined)).not.toThrow();
  });

  it('agenda verificação periódica de atualização quando registrado', () => {
    vi.useFakeTimers();
    try {
      const registration = { update: vi.fn() };
      const { unmount } = renderHook(() => useAppUpdate());

      const options = registerSW.mock.calls[0][0];
      act(() => options.onRegisteredSW('/sw.js', registration));

      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(registration.update).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(registration.update).toHaveBeenCalledTimes(2);

      unmount();
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(registration.update).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
