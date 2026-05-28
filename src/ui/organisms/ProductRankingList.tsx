import { Money } from '../atoms/Money';
import type { ProductRankingEntry } from '../../domain/order/order.report';

interface ProductRankingListProps {
  products: ProductRankingEntry[];
  emptyLabel: string;
}

export function ProductRankingList({
  products,
  emptyLabel,
}: ProductRankingListProps) {
  if (products.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-ink-tertiary">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {products.map((product, index) => (
        <div
          key={product.name}
          className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-2"
        >
          <span className="font-mono text-sm font-bold tabular-nums text-ink-tertiary">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-ink-primary">
            {product.name}
          </span>
          <span className="font-mono text-sm tabular-nums text-ink-tertiary">
            {product.qty}x
          </span>
          <Money value={product.total} className="font-bold" />
        </div>
      ))}
    </div>
  );
}
