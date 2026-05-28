import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../shared/either';
import { InvalidCashAmountError, InvalidCashMovementError } from '../errors';
import {
  buildCashMovement,
  calculateExpectedCash,
  normalizeCashInitial,
  type CashMovementInput,
} from './cash.rules';
import type { CashMovement } from './cash.entity';

const movement = (over: Partial<CashMovement> = {}): CashMovement => ({
  id: 1,
  sessionId: 1,
  type: 'suprimento',
  amount: 10,
  reason: '',
  createdAt: 0,
  ...over,
});

describe('normalizeCashInitial', () => {
  it('accepts a non-negative amount', () => {
    const result = normalizeCashInitial(50);
    expect(isRight(result) && result.right).toBe(50);
  });

  it('accepts zero', () => {
    expect(isRight(normalizeCashInitial(0))).toBe(true);
  });

  it('rejects a negative amount', () => {
    const result = normalizeCashInitial(-1);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCashAmountError);
    }
  });

  it('rejects a non-finite amount', () => {
    expect(isLeft(normalizeCashInitial(Number.NaN))).toBe(true);
  });
});

describe('buildCashMovement', () => {
  const input = (over: Partial<CashMovementInput> = {}): CashMovementInput => ({
    type: 'sangria',
    amount: 25,
    reason: '  troco  ',
    ...over,
  });

  it('normalizes a valid movement trimming the reason', () => {
    const result = buildCashMovement(input());
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.type).toBe('sangria');
      expect(result.right.amount).toBe(25);
      expect(result.right.reason).toBe('troco');
    }
  });

  it('rejects an invalid type', () => {
    const result = buildCashMovement(
      input({ type: 'outro' as CashMovementInput['type'] }),
    );
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCashMovementError);
    }
  });

  it('rejects a non-positive amount', () => {
    expect(isLeft(buildCashMovement(input({ amount: 0 })))).toBe(true);
  });

  it('rejects a non-finite amount', () => {
    expect(
      isLeft(buildCashMovement(input({ amount: Number.POSITIVE_INFINITY }))),
    ).toBe(true);
  });
});

describe('calculateExpectedCash', () => {
  it('sums initial cash and sales, adds supplies and subtracts withdrawals', () => {
    const expected = calculateExpectedCash({
      cashInitial: 100,
      cashSales: 200,
      movements: [
        movement({ type: 'suprimento', amount: 50 }),
        movement({ type: 'sangria', amount: 30 }),
        movement({ type: 'sangria', amount: 20 }),
      ],
    });
    expect(expected).toBe(300);
  });

  it('returns the initial cash when there are no sales or movements', () => {
    expect(
      calculateExpectedCash({
        cashInitial: 80,
        cashSales: 0,
        movements: [],
      }),
    ).toBe(80);
  });
});
