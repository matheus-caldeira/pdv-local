import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';

const productsToArray = vi.fn();
const filterSpy = vi.fn();

vi.mock('../../infrastructure/dexie/provider-registry', () => ({
  getDatabase: () => ({
    products: {
      filter: (predicate: (product: { active: boolean }) => boolean) => {
        filterSpy(predicate);
        return { toArray: productsToArray };
      },
    },
  }),
}));

function Probe() {
  const products = useProducts();
  return <span>count:{products.length}</span>;
}

describe('useProducts', () => {
  beforeEach(() => {
    productsToArray.mockReset();
    filterSpy.mockReset();
  });
  afterEach(cleanup);

  it('loads active products and applies the active filter', async () => {
    productsToArray.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('count:2')).toBeInTheDocument(),
    );
    const predicate = filterSpy.mock.calls[0][0];
    expect(predicate({ active: true })).toBe(true);
    expect(predicate({ active: false })).toBe(false);
  });

  it('ignores a late resolution after unmount', async () => {
    let resolve: (value: unknown[]) => void = () => {};
    productsToArray.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve([{ id: 1 }]);
    await Promise.resolve();
    expect(screen.queryByText('count:1')).not.toBeInTheDocument();
  });
});
