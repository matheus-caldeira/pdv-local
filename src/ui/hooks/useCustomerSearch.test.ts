import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useCustomerSearch } from './useCustomerSearch';

const searchCustomers = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    searchCustomers: (value: string) => searchCustomers(value),
  },
}));

describe('useCustomerSearch', () => {
  afterEach(() => {
    cleanup();
    searchCustomers.mockReset();
  });

  it('shows the matches returned by the use case', async () => {
    searchCustomers.mockResolvedValue(
      right([
        { uid: 'c-1', phone: '99887766' },
        { uid: 'c-2', phone: '99880000' },
      ]),
    );
    const { result } = renderHook(() => useCustomerSearch());

    await act(async () => {
      await result.current.search('  9988  ');
    });

    await waitFor(() => expect(result.current.suggestions).toHaveLength(2));
    expect(searchCustomers).toHaveBeenCalledWith('  9988  ');
  });

  it('clears suggestions on failure', async () => {
    searchCustomers.mockResolvedValue(left(new ConnectorError('x')));
    const { result } = renderHook(() => useCustomerSearch());

    await act(async () => {
      await result.current.search('9988');
    });

    expect(result.current.suggestions).toEqual([]);
  });

  it('clears suggestions on demand', async () => {
    searchCustomers.mockResolvedValue(right([{ uid: 'c-1', phone: '9988' }]));
    const { result } = renderHook(() => useCustomerSearch());

    await act(async () => {
      await result.current.search('9988');
    });
    await waitFor(() => expect(result.current.suggestions).toHaveLength(1));

    act(() => {
      result.current.clear();
    });

    expect(result.current.suggestions).toEqual([]);
  });
});
