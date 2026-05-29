import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useCustomerSearch } from './useCustomerSearch';

const customersToArray = vi.fn();

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({ customers: { toArray: customersToArray } }),
}));

function Probe() {
  const { suggestions, search, clear } = useCustomerSearch();
  return (
    <div>
      <span>count:{suggestions.length}</span>
      <ul>
        {suggestions.map((customer) => (
          <li key={customer.id}>{customer.phone}</li>
        ))}
      </ul>
      <button type="button" onClick={() => search('99')}>
        short
      </button>
      <button type="button" onClick={() => search('  9988  ')}>
        long
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
    </div>
  );
}

describe('useCustomerSearch', () => {
  beforeEach(() => {
    customersToArray.mockReset();
  });
  afterEach(cleanup);

  it('does not search for queries shorter than 3 chars', async () => {
    render(<Probe />);
    await act(async () => {
      screen.getByText('short').click();
    });
    expect(customersToArray).not.toHaveBeenCalled();
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('filters by phone substring and caps at six results', async () => {
    customersToArray.mockResolvedValue([
      { id: 1, phone: '99887766' },
      { id: 2, phone: '11112222' },
      { id: 3, phone: '99880000' },
      { id: 4, phone: '99881111' },
      { id: 5, phone: '99882222' },
      { id: 6, phone: '99883333' },
      { id: 7, phone: '99884444' },
      { id: 8, phone: '99885555' },
    ]);
    render(<Probe />);
    await act(async () => {
      screen.getByText('long').click();
    });
    await waitFor(() =>
      expect(screen.getByText('count:6')).toBeInTheDocument(),
    );
  });

  it('clears suggestions', async () => {
    customersToArray.mockResolvedValue([{ id: 1, phone: '9988' }]);
    render(<Probe />);
    await act(async () => {
      screen.getByText('long').click();
    });
    await waitFor(() =>
      expect(screen.getByText('count:1')).toBeInTheDocument(),
    );
    await act(async () => {
      screen.getByText('clear').click();
    });
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });
});
