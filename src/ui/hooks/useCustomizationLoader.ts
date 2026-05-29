import { useCallback } from 'react';
import { getDatabase } from '../../infrastructure/dexie/provider-registry';
import type { Product } from '../../domain/product/product.entity';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../../infrastructure/dexie/dexie-database';

export interface LoadedCustomizationGroup extends CustomizationGroup {
  items: CustomizationItem[];
}

export function useCustomizationLoader() {
  return useCallback(
    async (product: Product): Promise<LoadedCustomizationGroup[]> => {
      const db = getDatabase();
      const groupIds = product.customizationGroupIds || [];
      const groups: LoadedCustomizationGroup[] = [];
      for (const groupId of groupIds) {
        const group = await db.customizationGroups.get(groupId);
        if (!group) continue;
        const items = await db.customizationItems
          .where('groupId')
          .equals(groupId)
          .toArray();
        groups.push({
          ...group,
          items: items.filter((item) => item.active !== false),
        });
      }
      return groups;
    },
    [],
  );
}
