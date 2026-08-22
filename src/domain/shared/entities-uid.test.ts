import { describe, expect, it } from 'vitest';
import type { Product } from '../product/product.entity';
import type { Customer } from '../customer/customer.entity';
import type { Session, CashMovement } from '../cash/cash.entity';
import type {
  CustomizationGroup,
  CustomizationItem,
} from '../customization/customization.entity';

describe('entities carry a stable uid', () => {
  it('accepts uid and new refs on each business entity', () => {
    const product: Product = {
      uid: 'p1',
      name: 'X',
      category: 'c',
      costPrice: 0,
      salePrice: 1,
      stock: 0,
      tracksStock: true,
      active: true,
      customizationGroupIds: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const group: CustomizationGroup = {
      uid: 'g1',
      name: 'G',
      required: false,
      minQty: 0,
      maxQty: 1,
      chargeAfter: 0,
    };
    const item: CustomizationItem = {
      uid: 'i1',
      groupUid: 'g1',
      name: 'I',
      price: 0,
      maxQty: 1,
      chargeAfter: 0,
      active: true,
    };
    const session: Session = {
      uid: 's1',
      openedAt: 0,
      closedAt: null,
      cashInitial: 0,
      cashFinal: null,
      notes: '',
    };
    const movement: CashMovement = {
      uid: 'm1',
      sessionUid: 's1',
      type: 'sangria',
      amount: 1,
      reason: 'r',
      createdAt: 0,
    };
    const customer: Customer = {
      uid: 'c1',
      name: 'N',
      addresses: [],
      extra: {},
      createdAt: 0,
      updatedAt: 0,
    };
    expect([
      product.uid,
      group.uid,
      item.groupUid,
      session.uid,
      movement.sessionUid,
      customer.uid,
    ]).toEqual(['p1', 'g1', 'g1', 's1', 's1', 'c1']);
  });
});
