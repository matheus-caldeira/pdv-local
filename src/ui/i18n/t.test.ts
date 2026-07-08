import { describe, expect, it } from 'vitest';
import { t } from './t';

describe('t', () => {
  it('usa o rótulo do tipo quando existe', () => {
    expect(t('customer', 'scout')).toBe('Aluno');
  });
  it('cai para default quando o tipo não define a chave', () => {
    expect(t('order', 'quick_sale')).toBe('Venda');
    expect(t('customer', 'quick_sale')).toBe('Cliente');
  });
  it('devolve a própria key quando ninguém define', () => {
    expect(t('inexistente', 'scout')).toBe('inexistente');
  });
  it('sem businessTypeId usa só o default', () => {
    expect(t('customer')).toBe('Cliente');
  });
});
