import { describe, expect, it } from 'vitest';
import type { Order, OrderItem, OrderCustomizationItem } from './order.entity';

describe('Order is self-sufficient and merge-resilient', () => {
  it('references session/customer/product by uid and flattens customizations', () => {
    const customization: OrderCustomizationItem = {
      groupName: 'Molhos', name: 'Maionese', qty: 1, price: 0.5,
    };
    const item: OrderItem = {
      productUid: 'p1', name: 'Cachorro-quente', salePrice: 10, costPrice: 4,
      qty: 2, customizations: [customization], customizationTotal: 0.5,
    };
    const order: Order = {
      uid: 'o1', businessTypeId: 'scout', sessionUid: 's1', customerUid: 'c1',
      items: [item], total: 20.5, paymentMethod: null,
      customerName: 'Aluno', customerPhone: '', ticket: '42',
      stage: 'aceito', status: 'open', createdAt: 0, updatedAt: 0,
    };
    expect(order.sessionUid).toBe('s1');
    expect(order.items[0].customizations?.[0].groupName).toBe('Molhos');
    expect(order.businessTypeId).toBe('scout');
  });
});
