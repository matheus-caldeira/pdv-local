import { describe, expect, it } from 'vitest';
import { businessTypeIds, getBusinessType } from './registry';

describe('registry', () => {
  it('exposes the ids of all registered business types', () => {
    expect(businessTypeIds).toEqual(['scout', 'quick_sale', 'tab']);
  });

  it('resolve scout com rules e fields', () => {
    const def = getBusinessType('scout');
    expect(def?.rules).toEqual({ ordering: 'required', payment: 'deferred' });
    expect(def?.fields.business).toEqual([{ key: 'group', kind: 'text' }]);
    expect(def?.fields.customer).toEqual([
      {
        key: 'section',
        kind: 'select',
        options: ['lobinho', 'escoteiro', 'senior', 'pioneiro'],
      },
      { key: 'guardian', kind: 'text' },
    ]);
  });

  it('resolve quick_sale sem campos', () => {
    const def = getBusinessType('quick_sale');
    expect(def?.rules).toEqual({ ordering: 'none', payment: 'immediate' });
    expect(def?.fields.customer).toEqual([]);
  });

  it('resolve tab', () => {
    expect(getBusinessType('tab')?.rules).toEqual({
      ordering: 'optional',
      payment: 'deferred',
    });
  });

  it('retorna undefined para id desconhecido', () => {
    expect(getBusinessType('xyz')).toBeUndefined();
    expect(getBusinessType('')).toBeUndefined();
  });
});
