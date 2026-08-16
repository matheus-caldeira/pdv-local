import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { EmptyCartError, RequiredCustomizationMissingError } from '../errors';
import {
  ORDER_STAGES,
  STAGE_LABELS,
  calculateCustomizationTotal,
  calculateOrderTotal,
  canAddItems,
  canClose,
  canReopen,
  mergeOrderItems,
  nextStage,
  prevStage,
  validateCartNotEmpty,
  validateRequiredCustomizations,
} from './order.rules';
import type { Order, OrderItem } from './order.entity';

const item = (over: Partial<OrderItem> = {}): OrderItem => ({
  productUid: 'product-1',
  name: 'Item',
  salePrice: 10,
  costPrice: 5,
  qty: 1,
  ...over,
});

describe('order stages', () => {
  it('exposes the four stages in order', () => {
    expect(ORDER_STAGES).toEqual([
      'aceito',
      'em_preparo',
      'a_caminho',
      'finalizado',
    ]);
  });

  it('has a label for every stage', () => {
    expect(STAGE_LABELS.aceito).toBe('Aceito');
    expect(STAGE_LABELS.finalizado).toBe('Finalizado');
  });

  it('advances to the next stage', () => {
    expect(nextStage('aceito')).toBe('em_preparo');
  });

  it('returns null past the last stage', () => {
    expect(nextStage('finalizado')).toBeNull();
  });

  it('goes back to the previous stage', () => {
    expect(prevStage('em_preparo')).toBe('aceito');
  });

  it('returns null before the first stage', () => {
    expect(prevStage('aceito')).toBeNull();
  });
});

describe('calculateOrderTotal', () => {
  it('sums price times quantity', () => {
    expect(calculateOrderTotal([item({ salePrice: 10, qty: 2 })])).toBe(20);
  });

  it('adds the customization total per unit', () => {
    expect(
      calculateOrderTotal([
        item({ salePrice: 10, qty: 2, customizationTotal: 3 }),
      ]),
    ).toBe(26);
  });

  it('returns zero for an empty list', () => {
    expect(calculateOrderTotal([])).toBe(0);
  });
});

describe('calculateCustomizationTotal', () => {
  it('charges every selected paid unit when there is no free allowance', () => {
    expect(
      calculateCustomizationTotal([
        {
          required: false,
          minQty: 0,
          chargeAfter: 0,
          items: [{ qty: 2, price: 4, chargeAfter: 0 }],
        },
      ]),
    ).toBe(8);
  });

  it('skips items with zero quantity or zero price', () => {
    expect(
      calculateCustomizationTotal([
        {
          required: false,
          minQty: 0,
          chargeAfter: 0,
          items: [
            { qty: 0, price: 4, chargeAfter: 0 },
            { qty: 3, price: 0, chargeAfter: 0 },
          ],
        },
      ]),
    ).toBe(0);
  });

  it('applies the group-level free allowance first', () => {
    expect(
      calculateCustomizationTotal([
        {
          required: false,
          minQty: 0,
          chargeAfter: 1,
          items: [{ qty: 3, price: 2, chargeAfter: 0 }],
        },
      ]),
    ).toBe(4);
  });

  it('applies the item-level free allowance', () => {
    expect(
      calculateCustomizationTotal([
        {
          required: false,
          minQty: 0,
          chargeAfter: 0,
          items: [{ qty: 3, price: 2, chargeAfter: 2 }],
        },
      ]),
    ).toBe(2);
  });
});

describe('validateRequiredCustomizations', () => {
  it('passes when required groups meet the minimum', () => {
    const result = validateRequiredCustomizations([
      { name: 'Ponto', required: true, minQty: 1, selectedQty: 1 },
    ]);
    expect(isRight(result)).toBe(true);
  });

  it('ignores optional groups below the minimum', () => {
    const result = validateRequiredCustomizations([
      { name: 'Extra', required: false, minQty: 2, selectedQty: 0 },
    ]);
    expect(isRight(result)).toBe(true);
  });

  it('defaults the minimum to one when minQty is zero', () => {
    const result = validateRequiredCustomizations([
      { name: 'Ponto', required: true, minQty: 0, selectedQty: 0 },
    ]);
    expect(isLeft(result)).toBe(true);
  });

  it('fails with the missing group details', () => {
    const result = validateRequiredCustomizations([
      { name: 'Ponto', required: true, minQty: 2, selectedQty: 1 },
    ]);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(RequiredCustomizationMissingError);
      expect(result.left.groupName).toBe('Ponto');
      expect(result.left.minQty).toBe(2);
    }
  });
});

describe('validateCartNotEmpty', () => {
  it('passes for a non-empty cart', () => {
    expect(isRight(validateCartNotEmpty([item()]))).toBe(true);
  });

  it('fails for an empty cart', () => {
    const result = validateCartNotEmpty([]);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(EmptyCartError);
    }
  });
});

describe('canAddItems', () => {
  it('permite lançar itens em comanda aberta', () => {
    const order = { status: 'open', items: [] } as Order;
    expect(isRight(canAddItems(order))).toBe(true);
  });

  it('recusa lançar itens em comanda fechada', () => {
    const order = { status: 'pending', items: [] } as Order;
    const result = canAddItems(order);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_OPEN');
  });

  it('recusa lançar itens em comanda paga', () => {
    const order = { status: 'paid', items: [] } as Order;
    const result = canAddItems(order);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_OPEN');
  });

  it('recusa lançar itens em comanda cancelada', () => {
    const order = { status: 'cancelled', items: [] } as Order;
    expect(isLeft(canAddItems(order))).toBe(true);
  });
});

describe('canClose', () => {
  it('permite fechar comanda aberta com itens', () => {
    const order = {
      status: 'open',
      items: [{ name: 'Refri', qty: 1 } as OrderItem],
    } as Order;
    expect(isRight(canClose(order))).toBe(true);
  });

  it('recusa fechar comanda sem itens', () => {
    const order = { status: 'open', items: [] } as Order;
    const result = canClose(order);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('EMPTY_TAB');
  });

  it('recusa fechar comanda já fechada', () => {
    const order = {
      status: 'pending',
      items: [{ name: 'Refri', qty: 1 } as OrderItem],
    } as Order;
    const result = canClose(order);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_OPEN');
  });
});

describe('canReopen', () => {
  it('permite reabrir comanda fechada', () => {
    const order = { status: 'pending' } as Order;
    expect(isRight(canReopen(order))).toBe(true);
  });

  it('recusa reabrir comanda paga', () => {
    const order = { status: 'paid' } as Order;
    const result = canReopen(order);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) expect(result.left.code).toBe('TAB_NOT_CLOSED');
  });

  it('recusa reabrir comanda aberta', () => {
    const order = { status: 'open' } as Order;
    expect(isLeft(canReopen(order))).toBe(true);
  });

  it('recusa reabrir comanda cancelada', () => {
    const order = { status: 'cancelled' } as Order;
    expect(isLeft(canReopen(order))).toBe(true);
  });
});

describe('mergeOrderItems', () => {
  it('soma a quantidade de itens iguais', () => {
    const current: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ];
    const incoming: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 2 },
    ];
    const merged = mergeOrderItems(current, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(3);
  });

  it('mantém itens diferentes separados', () => {
    const current: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ];
    const incoming: OrderItem[] = [
      { name: 'Cachorro', salePrice: 10, costPrice: 4, qty: 1 },
    ];
    expect(mergeOrderItems(current, incoming)).toHaveLength(2);
  });

  it('não agrupa itens com observação diferente', () => {
    const current: OrderItem[] = [
      {
        name: 'Refri',
        salePrice: 5,
        costPrice: 2,
        qty: 1,
        observation: 'gelado',
      },
    ];
    const incoming: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ];
    expect(mergeOrderItems(current, incoming)).toHaveLength(2);
  });

  it('não agrupa itens com adicionais diferentes', () => {
    const current: OrderItem[] = [
      {
        name: 'Cachorro',
        salePrice: 10,
        costPrice: 4,
        qty: 1,
        customizations: [
          { groupName: 'Extras', name: 'Bacon', qty: 1, price: 2 },
        ],
      },
    ];
    const incoming: OrderItem[] = [
      { name: 'Cachorro', salePrice: 10, costPrice: 4, qty: 1 },
    ];
    expect(mergeOrderItems(current, incoming)).toHaveLength(2);
  });

  it('preserva a lista atual quando não há itens novos', () => {
    const current: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ];
    expect(mergeOrderItems(current, [])).toEqual(current);
  });

  it('devolve os itens novos quando a comanda está vazia', () => {
    const incoming: OrderItem[] = [
      { name: 'Refri', salePrice: 5, costPrice: 2, qty: 1 },
    ];
    expect(mergeOrderItems([], incoming)).toEqual(incoming);
  });
});
