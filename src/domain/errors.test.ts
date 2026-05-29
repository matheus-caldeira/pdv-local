import { describe, expect, it } from 'vitest';
import { AppError } from './shared/errors';
import {
  DomainError,
  EmptyCartError,
  InsufficientStockError,
  RequiredCustomizationMissingError,
  TicketLimitReachedError,
} from './errors';

describe('domain errors', () => {
  it('EmptyCartError carries its code and layer', () => {
    const error = new EmptyCartError();
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('EMPTY_CART');
    expect(error.layer).toBe('domain');
    expect(error.message).toContain('vazio');
  });

  it('RequiredCustomizationMissingError exposes group and minimum', () => {
    const error = new RequiredCustomizationMissingError('Ponto', 2);
    expect(error.code).toBe('REQUIRED_CUSTOMIZATION_MISSING');
    expect(error.groupName).toBe('Ponto');
    expect(error.minQty).toBe(2);
    expect(error.message).toContain('Ponto');
  });

  it('InsufficientStockError names the product', () => {
    const error = new InsufficientStockError('X-Burger');
    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.productName).toBe('X-Burger');
    expect(error.message).toContain('X-Burger');
  });

  it('TicketLimitReachedError carries its code', () => {
    const error = new TicketLimitReachedError();
    expect(error.code).toBe('TICKET_LIMIT_REACHED');
    expect(error.message).toContain('limite');
  });
});
