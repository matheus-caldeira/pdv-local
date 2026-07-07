import { useCallback } from 'react';
import { container } from '../../app/container';
import { fold } from '../../domain/shared/either';
import type { Product } from '../../domain/product/product.entity';
import type { LoadedCustomizationGroup } from '../../application/customization/customization.usecases';

export type { LoadedCustomizationGroup };

export function useCustomizationLoader() {
  return useCallback(
    async (product: Product): Promise<LoadedCustomizationGroup[]> => {
      const result = await container.loadProductCustomizations(
        product.customizationGroupIds || [],
      );
      return fold(
        result,
        () => [],
        (groups) => groups,
      );
    },
    [],
  );
}
