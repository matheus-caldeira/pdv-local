import { left, right, type Either } from '../shared/either';
import {
  EmptyCartError,
  EmptyTabError,
  RequiredCustomizationMissingError,
  TabNotClosedError,
  TabNotOpenError,
} from '../errors';
import type { Order, OrderItem, OrderStage } from './order.entity';

export const ORDER_STAGES: OrderStage[] = [
  'aceito',
  'em_preparo',
  'a_caminho',
  'finalizado',
];

export const STAGE_LABELS: Record<OrderStage, string> = {
  aceito: 'Aceito',
  em_preparo: 'Em preparo',
  a_caminho: 'A caminho',
  finalizado: 'Finalizado',
};

export function nextStage(stage: OrderStage): OrderStage | null {
  const index = ORDER_STAGES.indexOf(stage);
  return index >= 0 && index < ORDER_STAGES.length - 1
    ? ORDER_STAGES[index + 1]
    : null;
}

export function prevStage(stage: OrderStage): OrderStage | null {
  const index = ORDER_STAGES.indexOf(stage);
  return index > 0 ? ORDER_STAGES[index - 1] : null;
}

export function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + (item.salePrice + (item.customizationTotal ?? 0)) * item.qty,
    0,
  );
}

export interface CustomizationItemSelection {
  qty: number;
  price: number;
  chargeAfter: number;
}

export interface CustomizationGroupSelection {
  required: boolean;
  minQty: number;
  chargeAfter: number;
  items: CustomizationItemSelection[];
}

export function calculateCustomizationTotal(
  groups: CustomizationGroupSelection[],
): number {
  let total = 0;
  for (const group of groups) {
    let freeAtGroup = group.chargeAfter;
    for (const item of group.items) {
      if (item.qty <= 0 || item.price <= 0) continue;
      for (let unit = 0; unit < item.qty; unit++) {
        if (freeAtGroup > 0) {
          freeAtGroup--;
          continue;
        }
        if (item.chargeAfter > 0 && unit < item.chargeAfter) {
          continue;
        }
        total += item.price;
      }
    }
  }
  return total;
}

export interface RequiredGroupValidation {
  name: string;
  required: boolean;
  minQty: number;
  selectedQty: number;
}

export function validateRequiredCustomizations(
  groups: RequiredGroupValidation[],
): Either<RequiredCustomizationMissingError, void> {
  for (const group of groups) {
    if (!group.required) continue;
    const minimum = group.minQty || 1;
    if (group.selectedQty < minimum) {
      return left(new RequiredCustomizationMissingError(group.name, minimum));
    }
  }
  return right(undefined);
}

export function validateCartNotEmpty(
  items: OrderItem[],
): Either<EmptyCartError, void> {
  return items.length === 0 ? left(new EmptyCartError()) : right(undefined);
}

export function canAddItems(order: Order): Either<TabNotOpenError, void> {
  return order.status === 'open'
    ? right(undefined)
    : left(new TabNotOpenError());
}

export function canClose(
  order: Order,
): Either<TabNotOpenError | EmptyTabError, void> {
  if (order.status !== 'open') return left(new TabNotOpenError());
  if (order.items.length === 0) return left(new EmptyTabError());
  return right(undefined);
}

export function canReopen(order: Order): Either<TabNotClosedError, void> {
  return order.status === 'pending'
    ? right(undefined)
    : left(new TabNotClosedError());
}

function itemSignature(item: OrderItem): string {
  const customizations = (item.customizations ?? [])
    .map((entry) => `${entry.groupName}:${entry.name}:${entry.qty}`)
    .sort()
    .join('|');
  return [
    item.productUid ?? item.name,
    item.salePrice,
    item.observation ?? '',
    customizations,
  ].join('#');
}

export function mergeOrderItems(
  current: OrderItem[],
  incoming: OrderItem[],
): OrderItem[] {
  const merged = current.map((item) => ({ ...item }));
  for (const item of incoming) {
    const signature = itemSignature(item);
    const existing = merged.find(
      (candidate) => itemSignature(candidate) === signature,
    );
    if (existing) {
      existing.qty += item.qty;
      continue;
    }
    merged.push({ ...item });
  }
  return merged;
}
