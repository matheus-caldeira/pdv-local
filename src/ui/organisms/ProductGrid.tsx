import { useMemo, useState } from 'react';
import { Money } from '../atoms/Money';
import { cn } from '../lib/cn';
import type { Product } from '../../domain/product/product.entity';
import type { CartItem } from '../hooks/usePdvController';

interface ProductGridProps {
  products: Product[];
  cart: CartItem[];
  onSelect: (product: Product) => void;
}

export function ProductGrid({ products, cart, onSelect }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  const filtered = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Venda Rapida</h1>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3">
          <button
            type="button"
            className={cn(
              'flex-shrink-0 whitespace-nowrap rounded-full border border-border-emphasis px-4 py-2 text-sm font-semibold transition-colors',
              !selectedCategory
                ? 'border-cardapio-bg bg-cardapio-bg text-cardapio-text'
                : 'bg-surface-2 text-ink-secondary hover:bg-surface-inset',
            )}
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={cn(
                'flex-shrink-0 whitespace-nowrap rounded-full border border-border-emphasis px-4 py-2 text-sm font-semibold transition-colors',
                selectedCategory === cat
                  ? 'border-cardapio-bg bg-cardapio-bg text-cardapio-text'
                  : 'bg-surface-2 text-ink-secondary hover:bg-surface-inset',
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg bg-cardapio-bg p-10 text-center text-sm text-cardapio-muted">
            {products.length === 0
              ? 'Cadastre produtos primeiro'
              : 'Nenhum produto nesta categoria'}
          </div>
        ) : (
          filtered.map((product) => {
            const inCartQty = cart
              .filter((item) => item.productId === product.id)
              .reduce((sum, item) => sum + item.qty, 0);
            const hasCustom = (product.customizationGroupIds?.length || 0) > 0;
            return (
              <button
                key={product.id}
                type="button"
                className={cn(
                  'relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-transparent bg-cardapio-bg px-3 py-4 text-center transition-colors hover:bg-cardapio-surface active:scale-[0.97]',
                  inCartQty > 0 && 'border-accent',
                )}
                onClick={() => onSelect(product)}
              >
                <span className="text-sm font-semibold text-cardapio-text">
                  {product.name}
                </span>
                <Money
                  value={product.salePrice}
                  className="text-base font-bold text-accent"
                />
                {hasCustom && (
                  <span className="absolute bottom-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-cardapio-surface text-xs font-bold text-cardapio-muted">
                    +
                  </span>
                )}
                {inCartQty > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold tabular-nums text-accent-text">
                    {inCartQty}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
