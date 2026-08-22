import { describe, expect, it } from 'vitest';
import {
  buildBusinessInfo,
  formatTicket,
  nextTicketCounter,
  normalizeLayoutMode,
  normalizeTicketCounter,
  normalizeTicketLimit,
  shouldClaimTicket,
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

describe('normalizeLayoutMode', () => {
  it('aceita os três modos válidos', () => {
    expect(normalizeLayoutMode('auto')).toBe('auto');
    expect(normalizeLayoutMode('mobile')).toBe('mobile');
    expect(normalizeLayoutMode('desktop')).toBe('desktop');
  });

  it('cai em auto para qualquer valor inválido', () => {
    expect(normalizeLayoutMode('tablet')).toBe('auto');
    expect(normalizeLayoutMode('')).toBe('auto');
    expect(normalizeLayoutMode(undefined)).toBe('auto');
  });
});

describe('shouldClaimTicket', () => {
  it('reserva o próximo número quando nenhum ticket foi informado', () => {
    expect(shouldClaimTicket(undefined, '0001')).toBe(true);
    expect(shouldClaimTicket('', '0001')).toBe(true);
    expect(shouldClaimTicket('   ', '0001')).toBe(true);
  });

  it('reserva o próximo número quando o informado é igual à sugestão', () => {
    expect(shouldClaimTicket('0001', '0001')).toBe(true);
    expect(shouldClaimTicket(' 0001 ', '0001')).toBe(true);
  });

  it('não reserva quando o usuário digitou outro número', () => {
    expect(shouldClaimTicket('42', '0001')).toBe(false);
  });
});
