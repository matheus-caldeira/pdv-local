import { defaultLabels } from './default';
import { scoutLabels } from './scout';
import { quickSaleLabels } from './quick_sale';
import { tabLabels } from './tab';

const byType: Record<string, Record<string, string>> = {
  scout: scoutLabels,
  quick_sale: quickSaleLabels,
  tab: tabLabels,
};

export function t(key: string, businessTypeId?: string): string {
  const typeLabels = businessTypeId ? byType[businessTypeId] : undefined;
  return typeLabels?.[key] ?? defaultLabels[key] ?? key;
}
