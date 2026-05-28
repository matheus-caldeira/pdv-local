import { describe, expect, it } from 'vitest';
import { formatTicket, nextTicketCounter } from './config.rules';

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
