import { describe, expect, it } from 'vitest';
import { reconcileInvoice, resolveInvoiceMonth } from './invoice.rules';

const at = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day).getTime();

describe('resolveInvoiceMonth', () => {
  it('compra antes do fechamento vence no mês seguinte', () => {
    const result = resolveInvoiceMonth(at(2026, 7, 20), 25, 5);
    expect(result.month).toBe('2026-08');
    expect(new Date(result.dueDate).getDate()).toBe(5);
  });

  it('compra no dia do fechamento cai na fatura seguinte', () => {
    const result = resolveInvoiceMonth(at(2026, 7, 25), 25, 5);
    expect(result.month).toBe('2026-09');
  });

  it('compra depois do fechamento cai na fatura seguinte', () => {
    const result = resolveInvoiceMonth(at(2026, 7, 28), 25, 5);
    expect(result.month).toBe('2026-09');
  });

  it('vencimento maior que fechamento vence no mesmo mês', () => {
    const result = resolveInvoiceMonth(at(2026, 7, 5), 10, 20);
    expect(result.month).toBe('2026-07');
    expect(new Date(result.dueDate).getDate()).toBe(20);
  });

  it('vira o ano corretamente', () => {
    const result = resolveInvoiceMonth(at(2026, 12, 20), 25, 5);
    expect(result.month).toBe('2027-01');
  });

  it('clampa o fechamento em fevereiro comum', () => {
    const result = resolveInvoiceMonth(at(2027, 2, 27), 31, 10);
    expect(result.month).toBe('2027-03');
  });

  it('clampa o fechamento em fevereiro bissexto', () => {
    const result = resolveInvoiceMonth(at(2028, 2, 28), 31, 10);
    expect(result.month).toBe('2028-03');
  });

  it('compra no dia do fechamento clampado cai na fatura seguinte', () => {
    const result = resolveInvoiceMonth(at(2027, 2, 28), 31, 10);
    expect(result.month).toBe('2027-04');
  });

  it('compra na véspera do fechamento clampado cai na fatura corrente', () => {
    const result = resolveInvoiceMonth(at(2027, 2, 27), 31, 10);
    expect(result.month).toBe('2027-03');
  });

  it('clampa o vencimento em mês de 30 dias', () => {
    const result = resolveInvoiceMonth(at(2026, 4, 5), 10, 31);
    expect(result.month).toBe('2026-04');
    expect(new Date(result.dueDate).getDate()).toBe(30);
  });

  it('fecha 30 e vence 31 colidem em fevereiro sem empurrar o mês', () => {
    const result = resolveInvoiceMonth(at(2027, 2, 1), 30, 31);
    expect(result.month).toBe('2027-02');
    expect(new Date(result.dueDate).getDate()).toBe(28);
  });
});

describe('reconcileInvoice', () => {
  it('gera ajuste quando o detalhado é menor', () => {
    expect(reconcileInvoice(1000, 400)).toEqual({
      kind: 'adjustment',
      amount: 600,
    });
  });

  it('não gera ajuste quando bate exato', () => {
    expect(reconcileInvoice(1000, 1000)).toEqual({ kind: 'balanced' });
  });

  it('sinaliza excesso quando o detalhado passa', () => {
    expect(reconcileInvoice(1000, 1100)).toEqual({ kind: 'over', excess: 100 });
  });

  it('fica equilibrada quando não há valor informado', () => {
    expect(reconcileInvoice(null, 400)).toEqual({ kind: 'balanced' });
  });

  it('arredonda o ajuste para duas casas', () => {
    expect(reconcileInvoice(1000, 333.333)).toEqual({
      kind: 'adjustment',
      amount: 666.67,
    });
  });

  it('estorno aumenta o ajuste', () => {
    expect(reconcileInvoice(1000, 300)).toEqual({
      kind: 'adjustment',
      amount: 700,
    });
  });
});
