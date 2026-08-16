import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useCustomerSearch } from './useCustomerSearch';

const searchCustomersByPhone = vi.fn();
const searchCustomersByName = vi.fn();

vi.mock('../../app/container', () => ({
  container: {
    searchCustomersByPhone: (value: string) => searchCustomersByPhone(value),
    searchCustomersByName: (value: string) => searchCustomersByName(value),
  },
}));

function Probe() {
  const {
    suggestions,
    search,
    clear,
    nameSuggestions,
    searchByName,
    clearByName,
  } = useCustomerSearch();
  return (
    <div>
      <span>count:{suggestions.length}</span>
      <span>nameCount:{nameSuggestions.length}</span>
      <button type="button" onClick={() => search('  9988  ')}>
        search
      </button>
      <button type="button" onClick={clear}>
        clear
      </button>
      <button type="button" onClick={() => searchByName('Maju')}>
        searchByName
      </button>
      <button type="button" onClick={clearByName}>
        clearByName
      </button>
    </div>
  );
}

describe('useCustomerSearch', () => {
  beforeEach(() => {
    searchCustomersByPhone.mockReset();
    searchCustomersByName.mockReset();
  });
  afterEach(cleanup);

  it('shows the matches returned by the use case', async () => {
    searchCustomersByPhone.mockResolvedValue(
      right([
        { id: 1, phone: '99887766' },
        { id: 2, phone: '99880000' },
      ]),
    );
    render(<Probe />);
    await act(async () => {
      screen.getByText('search').click();
    });
    await waitFor(() =>
      expect(screen.getByText('count:2')).toBeInTheDocument(),
    );
    expect(searchCustomersByPhone).toHaveBeenCalledWith('  9988  ');
  });

  it('clears suggestions on failure', async () => {
    searchCustomersByPhone.mockResolvedValue(left(new ConnectorError('x')));
    render(<Probe />);
    await act(async () => {
      screen.getByText('search').click();
    });
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('clears suggestions on demand', async () => {
    searchCustomersByPhone.mockResolvedValue(right([{ id: 1, phone: '9988' }]));
    render(<Probe />);
    await act(async () => {
      screen.getByText('search').click();
    });
    await waitFor(() =>
      expect(screen.getByText('count:1')).toBeInTheDocument(),
    );
    await act(async () => {
      screen.getByText('clear').click();
    });
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });

  it('shows the name matches returned by the use case', async () => {
    searchCustomersByName.mockResolvedValue(
      right([
        { id: 1, name: 'Maju' },
        { id: 2, name: 'Maju (Lobinha)' },
      ]),
    );
    render(<Probe />);
    await act(async () => {
      screen.getByText('searchByName').click();
    });
    await waitFor(() =>
      expect(screen.getByText('nameCount:2')).toBeInTheDocument(),
    );
    expect(searchCustomersByName).toHaveBeenCalledWith('Maju');
  });

  it('clears name suggestions on failure', async () => {
    searchCustomersByName.mockResolvedValue(left(new ConnectorError('x')));
    render(<Probe />);
    await act(async () => {
      screen.getByText('searchByName').click();
    });
    expect(screen.getByText('nameCount:0')).toBeInTheDocument();
  });

  it('shows no name matches for an empty result', async () => {
    searchCustomersByName.mockResolvedValue(right([]));
    render(<Probe />);
    await act(async () => {
      screen.getByText('searchByName').click();
    });
    expect(screen.getByText('nameCount:0')).toBeInTheDocument();
  });

  it('clears name suggestions on demand', async () => {
    searchCustomersByName.mockResolvedValue(right([{ id: 1, name: 'Maju' }]));
    render(<Probe />);
    await act(async () => {
      screen.getByText('searchByName').click();
    });
    await waitFor(() =>
      expect(screen.getByText('nameCount:1')).toBeInTheDocument(),
    );
    await act(async () => {
      screen.getByText('clearByName').click();
    });
    expect(screen.getByText('nameCount:0')).toBeInTheDocument();
  });
});
