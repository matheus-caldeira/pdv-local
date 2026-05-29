import { useCallback, useEffect, useState } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Product } from '../../domain/product/product.entity';
import type { ProductInput } from '../../domain/product/product.rules';
import type { CustomizationGroup } from '../../domain/customization/customization.entity';
import { useToast } from '../molecules/toast-context';

export function useProductsCatalog() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<CustomizationGroup[]>([]);

  const loadProducts = useCallback(async () => {
    const result = await container.listProducts();
    fold(
      result,
      (error) => toast(error.message, 'error'),
      (list) =>
        setProducts([...list].sort((a, b) => a.name.localeCompare(b.name))),
    );
  }, [toast]);

  const loadGroups = useCallback(async () => {
    const result = await container.listGroups();
    fold(
      result,
      (error) => toast(error.message, 'error'),
      (list) => setGroups(list),
    );
  }, [toast]);

  useEffect(() => {
    loadProducts();
    loadGroups();
  }, [loadProducts, loadGroups]);

  const saveProduct = useCallback(
    async (input: ProductInput, id?: number) => {
      const result = id
        ? await container.updateProduct(id, input)
        : await container.createProduct(input);
      return fold(
        result,
        (error) => {
          toast(error.message, 'error');
          return false;
        },
        () => {
          toast(id ? 'Produto atualizado' : 'Produto criado');
          loadProducts();
          return true;
        },
      );
    },
    [toast, loadProducts],
  );

  const removeProduct = useCallback(
    async (id: number) => {
      const result = await container.removeProduct(id);
      fold(
        result,
        (error) => toast(error.message, 'error'),
        () => {
          toast('Produto removido');
          loadProducts();
        },
      );
    },
    [toast, loadProducts],
  );

  return { products, groups, saveProduct, removeProduct };
}
