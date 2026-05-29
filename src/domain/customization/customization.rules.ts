import { left, right, type Either } from '../shared/either';
import { InvalidCustomizationError } from '../errors';
import type {
  NewCustomizationGroup,
  NewCustomizationItem,
} from './customization.entity';

export interface CustomizationGroupInput {
  name: string;
  required: boolean;
  minQty: number;
  maxQty: number;
  chargeAfter: number;
}

export interface CustomizationItemInput {
  groupId: number;
  name: string;
  price: number;
  maxQty: number;
  chargeAfter: number;
  active: boolean;
}

export function buildCustomizationGroup(
  input: CustomizationGroupInput,
): Either<InvalidCustomizationError, NewCustomizationGroup> {
  const name = input.name.trim();
  if (!name) {
    return left(new InvalidCustomizationError('Informe o nome do grupo.'));
  }
  return right({
    name,
    required: input.required,
    minQty: input.minQty,
    maxQty: input.maxQty,
    chargeAfter: input.chargeAfter,
  });
}

export function buildCustomizationItem(
  input: CustomizationItemInput,
): Either<InvalidCustomizationError, NewCustomizationItem> {
  const name = input.name.trim();
  if (!name) {
    return left(new InvalidCustomizationError('Informe o nome do item.'));
  }
  return right({
    groupId: input.groupId,
    name,
    price: input.price,
    maxQty: input.maxQty,
    chargeAfter: input.chargeAfter,
    active: input.active,
  });
}
