import type { BusinessTypeDefinition } from './business-type.entity';

export type { BusinessTypeDefinition } from './business-type.entity';

const scout: BusinessTypeDefinition = {
  id: 'scout',
  rules: { ordering: 'required', payment: 'deferred' },
  fields: {
    business: [{ key: 'group', kind: 'text' }],
    customer: [
      {
        key: 'section',
        kind: 'select',
        options: ['lobinho', 'escoteiro', 'senior', 'pioneiro'],
      },
      { key: 'guardian', kind: 'text' },
    ],
  },
};

const quickSale: BusinessTypeDefinition = {
  id: 'quick_sale',
  rules: { ordering: 'none', payment: 'immediate' },
  fields: { business: [], customer: [] },
};

const tab: BusinessTypeDefinition = {
  id: 'tab',
  rules: { ordering: 'optional', payment: 'deferred' },
  fields: { business: [], customer: [] },
};

const registry: Record<string, BusinessTypeDefinition> = {
  [scout.id]: scout,
  [quickSale.id]: quickSale,
  [tab.id]: tab,
};

export function getBusinessType(
  id: string,
): BusinessTypeDefinition | undefined {
  return registry[id];
}
