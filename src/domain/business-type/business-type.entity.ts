export type FieldKind = 'text' | 'select';

export interface FieldDef {
  key: string;
  kind: FieldKind;
  options?: string[];
}

export interface BusinessTypeRules {
  ordering: 'required' | 'optional' | 'none';
  payment: 'deferred' | 'immediate';
}

export interface BusinessTypeDefinition {
  id: string;
  rules: BusinessTypeRules;
  fields: {
    business: FieldDef[];
    customer: FieldDef[];
  };
}
