import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { InvalidCustomizationError } from '../errors';
import {
  buildCustomizationGroup,
  buildCustomizationItem,
  type CustomizationGroupInput,
  type CustomizationItemInput,
} from './customization.rules';

const groupInput = (
  over: Partial<CustomizationGroupInput> = {},
): CustomizationGroupInput => ({
  name: 'Ponto',
  required: true,
  minQty: 1,
  maxQty: 1,
  chargeAfter: 0,
  ...over,
});

const itemInput = (
  over: Partial<CustomizationItemInput> = {},
): CustomizationItemInput => ({
  groupId: 1,
  name: 'Bem passado',
  price: 0,
  maxQty: 1,
  chargeAfter: 0,
  active: true,
  ...over,
});

describe('buildCustomizationGroup', () => {
  it('builds a valid group with trimmed name', () => {
    const result = buildCustomizationGroup(groupInput({ name: '  Ponto  ' }));
    expect(isRight(result)).toBe(true);
    if (isRight(result)) expect(result.right.name).toBe('Ponto');
  });

  it('rejects an empty name', () => {
    const result = buildCustomizationGroup(groupInput({ name: '  ' }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCustomizationError);
    }
  });
});

describe('buildCustomizationItem', () => {
  it('builds a valid item with trimmed name', () => {
    const result = buildCustomizationItem(itemInput({ name: '  Extra  ' }));
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.name).toBe('Extra');
      expect(result.right.groupId).toBe(1);
    }
  });

  it('rejects an empty name', () => {
    const result = buildCustomizationItem(itemInput({ name: '' }));
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCustomizationError);
    }
  });
});
