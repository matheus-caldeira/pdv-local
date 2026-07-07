import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { left, right } from '../../domain/shared/either';
import { ConnectorError } from '../../infrastructure/errors';
import { useProducts } from './useProducts';

const listActiveProducts = vi.fn();

vi.mock('../../app/container', () => ({
  container: { listActiveProducts: () => listActiveProducts() },
}));

function Probe() {
  const products = useProducts();
  return <span>count:{products.length}</span>;
}

describe('useProducts', () => {
  beforeEach(() => {
    listActiveProducts.mockReset();
  });
  afterEach(cleanup);

  it('loads active products from the use case', async () => {
    listActiveProducts.mockResolvedValue(right([{ id: 1 }, { id: 2 }]));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('count:2')).toBeInTheDocument(),
    );
  });

  it('shows an empty list when the use case fails', async () => {
    listActiveProducts.mockResolvedValue(left(new ConnectorError('x')));
    render(<Probe />);
    await waitFor(() =>
      expect(screen.getByText('count:0')).toBeInTheDocument(),
    );
  });

  it('ignores a late resolution after unmount', async () => {
    let resolve: (value: unknown) => void = () => {};
    listActiveProducts.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { unmount } = render(<Probe />);
    unmount();
    resolve(right([{ id: 1 }]));
    await Promise.resolve();
    expect(screen.queryByText('count:1')).not.toBeInTheDocument();
  });
});
