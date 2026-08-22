import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Money } from '../atoms/Money';
import { cn } from '../lib/cn';
import type { Product } from '../../domain/product/product.entity';
import type { CartItem } from '../hooks/usePdvController';

interface ProductGridProps {
  products: Product[];
  cart: CartItem[];
  onSelect: (product: Product) => void;
  linear?: boolean;
}

const UNCATEGORIZED = 'Outros';

function categoryOf(product: Product): string {
  return product.category.trim() || UNCATEGORIZED;
}

function categorySlug(category: string): string {
  return `categoria-${category.toLowerCase().replace(/\s+/g, '-')}`;
}

function useProductSections(products: Product[]) {
  return useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const category = categoryOf(product);
      groups.set(category, [...(groups.get(category) ?? []), product]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category, items }));
  }, [products]);
}

function ProductCard({
  product,
  inCartQty,
  linear,
  onSelect,
}: {
  product: Product;
  inCartQty: number;
  linear: boolean;
  onSelect: (product: Product) => void;
}) {
  const hasCustom = (product.customizationGroupIds?.length || 0) > 0;
  const outOfStock = product.tracksStock && product.stock <= 0;

  return (
    <button
      type="button"
      className={cn(
        'relative border-2 border-transparent bg-cardapio-bg transition-colors hover:bg-cardapio-surface active:scale-[0.99]',
        linear
          ? 'flex w-full items-center gap-3 rounded-md px-4 py-3 text-left'
          : 'flex min-h-20 flex-col items-center justify-center gap-1 rounded-md px-3 py-4 text-center',
        inCartQty > 0 && 'border-accent',
      )}
      onClick={() => onSelect(product)}
    >
      <span
        className={cn(
          'text-sm font-semibold text-cardapio-text',
          linear && 'min-w-0 flex-1',
        )}
      >
        {product.name}
        {hasCustom && (
          <span className="ml-1 text-xs font-normal text-cardapio-muted">
            +
          </span>
        )}
      </span>

      {product.tracksStock && (
        <span
          className={cn(
            'font-mono text-xs tabular-nums text-cardapio-muted',
            outOfStock && 'text-danger',
          )}
        >
          {product.stock} un.
        </span>
      )}

      <Money
        value={product.salePrice}
        className="text-base font-bold text-accent"
      />

      {outOfStock && (
        <span
          aria-label={product.stock < 0 ? 'Estoque negativo' : 'Sem estoque'}
          className={cn(
            'flex h-[18px] w-[18px] items-center justify-center rounded-full bg-danger text-accent-text',
            linear ? 'order-first' : 'absolute left-1 top-1',
          )}
        >
          <AlertTriangle size={11} />
        </span>
      )}

      {inCartQty > 0 && (
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold tabular-nums text-accent-text',
            linear ? '' : 'absolute -right-1.5 -top-1.5',
          )}
        >
          {inCartQty}
        </span>
      )}
    </button>
  );
}

export function ProductGrid({
  products,
  cart,
  onSelect,
  linear = false,
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sections = useProductSections(products);
  const containerRef = useRef<HTMLDivElement>(null);

  const categories = sections.map((section) => section.category);

  useEffect(() => {
    if (!linear || typeof IntersectionObserver !== 'function') return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible) {
          setActiveCategory(visible.target.getAttribute('data-category'));
        }
      },
      { rootMargin: '-96px 0px -70% 0px' },
    );

    container
      .querySelectorAll('[data-category]')
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [linear, sections]);

  function goToCategory(category: string) {
    setActiveCategory(category);
    const target = document.getElementById(categorySlug(category));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const realCategories = [
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ].sort();

  const filtered = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  function inCartQty(product: Product): number {
    return cart
      .filter((item) => item.productUid === product.uid)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  if (products.length === 0) {
    return (
      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Venda Rapida
          </h1>
        </div>
        <div className="rounded-lg bg-cardapio-bg p-10 text-center text-sm text-cardapio-muted">
          Cadastre produtos primeiro
        </div>
      </div>
    );
  }

  if (linear) {
    return (
      <div className="min-w-0 flex-1" ref={containerRef}>
        <nav
          aria-label="Categorias"
          className="sticky top-0 z-30 -mx-4 flex gap-2 overflow-x-auto bg-surface-1 px-4 py-3"
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-current={activeCategory === category ? 'true' : undefined}
              className={cn(
                'flex-shrink-0 whitespace-nowrap rounded-full border border-border-emphasis px-4 py-2 text-sm font-semibold transition-colors',
                activeCategory === category
                  ? 'border-cardapio-bg bg-cardapio-bg text-cardapio-text'
                  : 'bg-surface-2 text-ink-secondary',
              )}
              onClick={() => goToCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-5">
          {sections.map((section) => (
            <section
              key={section.category}
              id={categorySlug(section.category)}
              data-category={section.category}
              aria-label={section.category}
              className="scroll-mt-20"
            >
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-tertiary">
                {section.category}
              </h2>
              <div className="flex flex-col gap-2">
                {section.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    inCartQty={inCartQty(product)}
                    linear
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Venda Rapida</h1>
      </div>

      {realCategories.length > 0 && (
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
          {realCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={cn(
                'flex-shrink-0 whitespace-nowrap rounded-full border border-border-emphasis px-4 py-2 text-sm font-semibold transition-colors',
                selectedCategory === category
                  ? 'border-cardapio-bg bg-cardapio-bg text-cardapio-text'
                  : 'bg-surface-2 text-ink-secondary hover:bg-surface-inset',
              )}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg bg-cardapio-bg p-10 text-center text-sm text-cardapio-muted">
            Nenhum produto nesta categoria
          </div>
        ) : (
          filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inCartQty={inCartQty(product)}
              linear={false}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
