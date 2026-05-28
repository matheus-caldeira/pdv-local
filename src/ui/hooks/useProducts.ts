import { useEffect, useState } from 'react';
import { getDatabase } from '../../infrastructure/dexie/provider-registry';
import type { Product } from '../../domain/product/product.entity';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDatabase()
      .products.filter((product) => product.active !== false)
      .toArray()
      .then((list) => {
        if (!cancelled) setProducts(list);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return products;
}
