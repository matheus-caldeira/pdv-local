import { useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Product } from '../../domain/product/product.entity';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    container.listActiveProducts().then((result) => {
      if (cancelled) return;
      fold(
        result,
        () => setProducts([]),
        (list) => setProducts(list),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return products;
}
