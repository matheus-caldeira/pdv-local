import { describe, expect, it } from 'vitest';
import {
  buildNavModel,
  preserveSearch,
  resolveActiveGroup,
  resolveActiveGroupId,
} from './nav-model';

const labels = (items: { label: string }[]) => items.map((i) => i.label);

describe('buildNavModel', () => {
  it('builds pdv, products and settings groups for pdv only', () => {
    const model = buildNavModel(['pdv'], false);
    expect(model.home?.to).toBe('/');
    expect(model.groups.map((g) => g.id)).toEqual([
      'pdv',
      'products',
      'settings',
    ]);
    expect(labels(model.groups[0].items)).toEqual([
      'Vender',
      'Pedidos',
      'Caixa',
      'Relatórios',
    ]);
    expect(labels(model.groups[1].items)).toEqual([
      'Clientes',
      'Produtos',
      'Extras',
    ]);
    expect(model.groups[1].label).toBe('Cadastros');
    expect(labels(model.groups[2].items)).toEqual([
      'Configurações',
      'Sobre e contato',
    ]);
  });

  it('includes kds and panel when status control is on', () => {
    const model = buildNavModel(['pdv'], true);
    expect(labels(model.groups[0].items)).toEqual([
      'Vender',
      'Pedidos',
      'KDS',
      'Caixa',
      'Painel',
      'Relatórios',
    ]);
  });

  it('puts kds in place of cash on the bottom bar when status control is on', () => {
    const model = buildNavModel(['pdv'], true);
    expect(labels(model.groups[0].bar)).toEqual([
      'Início',
      'Vender',
      'Pedidos',
      'KDS',
    ]);
  });

  it('keeps cash on the bottom bar when status control is off', () => {
    const model = buildNavModel(['pdv'], false);
    expect(labels(model.groups[0].bar)).toEqual([
      'Início',
      'Vender',
      'Pedidos',
      'Caixa',
    ]);
  });

  it('builds finance and settings groups without home for finance only', () => {
    const model = buildNavModel(['finance'], false);
    expect(model.home).toBeNull();
    expect(model.groups.map((g) => g.id)).toEqual(['finance', 'settings']);
    expect(labels(model.groups[0].items)).toEqual([
      'Resumo',
      'Lançamentos',
      'Orçamento',
      'Automações',
      'Projeção',
      'Fechamentos',
      'Faturas',
    ]);
    expect(labels(model.groups[1].items)).toEqual([
      'Configurações',
      'Config. do Financeiro',
      'Sobre e contato',
    ]);
  });

  it('includes the invoices link in the finance group', () => {
    const model = buildNavModel(['finance'], false);
    const finance = model.groups.find((g) => g.id === 'finance');
    const invoices = finance?.items.find(
      (item) => item.kind === 'link' && item.to === '/finance/invoices',
    );
    expect(invoices).toBeDefined();
    expect(invoices?.label).toBe('Faturas');
    expect(labels(finance!.bar)).not.toContain('Faturas');
  });

  it('marks the single module group as fixed', () => {
    expect(
      buildNavModel(['finance'], false).groups.find((g) => g.id === 'finance')
        ?.fixed,
    ).toBe(true);
    expect(
      buildNavModel(['pdv', 'finance'], false).groups.find(
        (g) => g.id === 'finance',
      )?.fixed,
    ).toBe(false);
  });

  it('defines the pdv bottom bar with home first', () => {
    const model = buildNavModel(['pdv', 'finance'], false);
    const pdv = model.groups.find((g) => g.id === 'pdv');
    expect(labels(pdv!.bar)).toEqual(['Início', 'Vender', 'Pedidos', 'Caixa']);
  });

  it('defines the finance bottom bar with the month picker tabs', () => {
    const model = buildNavModel(['finance'], false);
    const finance = model.groups.find((g) => g.id === 'finance');
    expect(labels(finance!.bar)).toEqual([
      'Resumo',
      'Lançamentos',
      'Orçamento',
      'Fechamentos',
    ]);
  });

  it('defines the settings bottom bar including the about action', () => {
    const both = buildNavModel(['pdv', 'finance'], false);
    const settings = both.groups.find((g) => g.id === 'settings');
    expect(labels(settings!.bar)).toEqual([
      'Configurações',
      'Config. do Financeiro',
      'Sobre e contato',
    ]);
    expect(settings!.bar.at(-1)?.kind).toBe('action');
    const pdvOnly = buildNavModel(['pdv'], false);
    expect(
      labels(pdvOnly.groups.find((g) => g.id === 'settings')!.bar),
    ).toEqual(['Configurações', 'Sobre e contato']);
  });
});

describe('resolveActiveGroupId', () => {
  const both = buildNavModel(['pdv', 'finance'], true);

  it.each([
    ['/', 'pdv'],
    ['/pdv', 'pdv'],
    ['/orders', 'pdv'],
    ['/kds', 'pdv'],
    ['/reports', 'pdv'],
    ['/products', 'products'],
    ['/customers', 'products'],
    ['/finance', 'finance'],
    ['/finance/entries', 'finance'],
    ['/finance/settings', 'settings'],
    ['/settings', 'settings'],
  ])('resolves %s to %s', (pathname, expected) => {
    expect(resolveActiveGroupId(pathname, both)).toBe(expected);
  });

  it('falls back to the first group on unknown paths', () => {
    expect(resolveActiveGroupId('/unknown', both)).toBe('pdv');
  });

  it('prefers the longest matching prefix across groups', () => {
    expect(resolveActiveGroupId('/finance/settings/extra', both)).toBe(
      'settings',
    );
  });

  it('resolves the root to the first group when there is no home', () => {
    const finance = buildNavModel(['finance'], false);
    expect(resolveActiveGroupId('/', finance)).toBe('finance');
  });
});

describe('resolveActiveGroup', () => {
  const both = buildNavModel(['pdv', 'finance'], true);

  it('returns the active group with its bottom bar', () => {
    const group = resolveActiveGroup('/finance/entries', both);
    expect(group.id).toBe('finance');
    expect(labels(group.bar)).toEqual([
      'Resumo',
      'Lançamentos',
      'Orçamento',
      'Fechamentos',
    ]);
  });

  it('returns the home group at the root', () => {
    expect(resolveActiveGroup('/', both).id).toBe('pdv');
  });

  it('returns the first group at the root when there is no home', () => {
    const finance = buildNavModel(['finance'], false);
    expect(resolveActiveGroup('/', finance).id).toBe('finance');
  });
});

describe('preserveSearch', () => {
  it('keeps the search between finance routes', () => {
    expect(preserveSearch('/finance/entries', '/finance/budget')).toBe(true);
  });

  it('drops the search when leaving or entering finance', () => {
    expect(preserveSearch('/finance', '/settings')).toBe(false);
    expect(preserveSearch('/pdv', '/finance')).toBe(false);
  });
});
