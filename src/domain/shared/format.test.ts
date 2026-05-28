import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatMoney, formatTime } from './format';

describe('format', () => {
  describe('formatMoney', () => {
    it('formats a value with comma decimals', () => {
      expect(formatMoney(12.5)).toBe('R$ 12,50');
    });

    it('formats zero', () => {
      expect(formatMoney(0)).toBe('R$ 0,00');
    });

    it('rounds to two decimals', () => {
      expect(formatMoney(1.005)).toBe('R$ 1,00');
    });
  });

  const timestamp = 1700000000000;

  describe('formatDate', () => {
    it('matches the pt-BR date for the timestamp', () => {
      expect(formatDate(timestamp)).toBe(
        new Date(timestamp).toLocaleDateString('pt-BR'),
      );
    });
  });

  describe('formatTime', () => {
    it('matches the pt-BR time for the timestamp', () => {
      expect(formatTime(timestamp)).toBe(
        new Date(timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
    });
  });

  describe('formatDateTime', () => {
    it('joins date and time', () => {
      expect(formatDateTime(timestamp)).toBe(
        `${formatDate(timestamp)} ${formatTime(timestamp)}`,
      );
    });
  });
});
