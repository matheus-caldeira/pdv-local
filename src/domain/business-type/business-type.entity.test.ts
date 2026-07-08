import { describe, expect, it } from 'vitest';
import type {
  BusinessTypeDefinition,
  BusinessTypeRules,
  FieldDef,
  FieldKind,
} from './business-type.entity';

describe('business-type.entity', () => {
  it('constrói um FieldDef de texto sem options', () => {
    const field: FieldDef = { key: 'group', kind: 'text' };
    expect(field.options).toBeUndefined();
  });

  it('constrói um FieldDef de select com options', () => {
    const kind: FieldKind = 'select';
    const field: FieldDef = { key: 'section', kind, options: ['lobinho'] };
    expect(field.options).toEqual(['lobinho']);
  });

  it('constrói BusinessTypeRules', () => {
    const rules: BusinessTypeRules = {
      ordering: 'required',
      payment: 'deferred',
    };
    expect(rules.ordering).toBe('required');
  });

  it('constrói uma BusinessTypeDefinition completa', () => {
    const def: BusinessTypeDefinition = {
      id: 'scout',
      rules: { ordering: 'required', payment: 'deferred' },
      fields: {
        business: [{ key: 'group', kind: 'text' }],
        customer: [{ key: 'guardian', kind: 'text' }],
      },
    };
    expect(def.fields.customer).toHaveLength(1);
  });
});
