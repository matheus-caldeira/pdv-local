import { describe, expect, it } from 'vitest';
import {
  buildBusinessInfo,
  formatTicket,
  nextTicketCounter,
  normalizeTicketCounter,
  normalizeTicketLimit,
} from './config.rules';

describe('formatTicket', () => {
  it('pads to the digit count of the limit', () => {
    expect(formatTicket(7, 9999)).toBe('0007');
  });

  it('uses three digits for a limit of 100', () => {
    expect(formatTicket(5, 100)).toBe('005');
  });

  it('falls back to a single digit for a zero limit', () => {
    expect(formatTicket(3, 0)).toBe('3');
  });
});

describe('nextTicketCounter', () => {
  it('increments by one', () => {
    expect(nextTicketCounter(1, 9999, true)).toBe(2);
  });

  it('resets to one past the limit when auto reset is on', () => {
    expect(nextTicketCounter(9999, 9999, true)).toBe(1);
  });

  it('keeps counting past the limit when auto reset is off', () => {
    expect(nextTicketCounter(9999, 9999, false)).toBe(10000);
  });
});

describe('buildBusinessInfo', () => {
  it('trims every field', () => {
    expect(
      buildBusinessInfo({
        name: '  Bar  ',
        document: ' 123 ',
        phone: ' 4199 ',
        address: ' Rua A ',
      }),
    ).toEqual({
      name: 'Bar',
      document: '123',
      phone: '4199',
      address: 'Rua A',
    });
  });
});

describe('normalizeTicketLimit', () => {
  it('floors and clamps to at least one', () => {
    expect(normalizeTicketLimit(99.9)).toBe(99);
    expect(normalizeTicketLimit(0)).toBe(1);
    expect(normalizeTicketLimit(Number.NaN)).toBe(1);
  });
});

describe('normalizeTicketCounter', () => {
  it('floors and clamps to at least one', () => {
    expect(normalizeTicketCounter(5.7)).toBe(5);
    expect(normalizeTicketCounter(-3)).toBe(1);
    expect(normalizeTicketCounter(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
