import { describe, expect, it } from 'vitest';
import { searchDocs } from './search-engine';
import type { DocSearchEntry } from './search-index';

const entries: DocSearchEntry[] = [
  {
    slug: 'caixa',
    title: 'Caixa',
    section: 'No dia a dia',
    heading: null,
    anchor: null,
    text: 'Controla o dinheiro do dia',
  },
  {
    slug: 'caixa',
    title: 'Caixa',
    section: 'No dia a dia',
    heading: 'Fechar o caixa',
    anchor: 'fechar-o-caixa',
    text: 'Confira os valores e feche',
  },
  {
    slug: 'financeiro',
    title: 'Financeiro',
    section: 'Gestão',
    heading: 'Conciliar a fatura',
    anchor: 'conciliar-a-fatura',
    text: 'Informe o valor total da fatura do cartão',
  },
];

describe('searchDocs', () => {
  it('retorna vazio para query curta', () => {
    expect(searchDocs(entries, 'a')).toEqual([]);
    expect(searchDocs(entries, ' ')).toEqual([]);
  });

  it('acha por corpo, ignorando acento e caixa', () => {
    const r = searchDocs(entries, 'FATURA');
    expect(r[0].slug).toBe('financeiro');
    expect(r[0].anchor).toBe('conciliar-a-fatura');
    expect(r[0].snippet.toLowerCase()).toContain('fatura');
  });

  it('acha ignorando acento na query', () => {
    const r = searchDocs(entries, 'gestao');
    expect(r.length).toBe(0);
    const r2 = searchDocs(entries, 'conciliar');
    expect(r2[0].heading).toBe('Conciliar a fatura');
  });

  it('prioriza match no título/heading sobre corpo', () => {
    const r = searchDocs(entries, 'caixa');
    expect(r[0].title).toBe('Caixa');
    expect(r[0].score).toBeGreaterThanOrEqual(r[r.length - 1].score);
  });

  it('monta snippet com reticências quando o termo está no meio', () => {
    const long: DocSearchEntry[] = [
      {
        slug: 'x',
        title: 'X',
        section: 'S',
        heading: null,
        anchor: null,
        text: 'a'.repeat(60) + ' agulha ' + 'b'.repeat(60),
      },
    ];
    const r = searchDocs(long, 'agulha');
    expect(r[0].snippet.startsWith('…')).toBe(true);
    expect(r[0].snippet.endsWith('…')).toBe(true);
  });

  it('faz snippet do começo quando o termo casa só no título', () => {
    const r = searchDocs(
      [
        {
          slug: 'x',
          title: 'Caixa',
          section: 'S',
          heading: null,
          anchor: null,
          text: 'texto sem o termo do titulo',
        },
      ],
      'caixa',
    );
    expect(r[0].snippet).toBe('texto sem o termo do titulo');
  });

  it('usa o título como snippet quando não há corpo nem heading', () => {
    const r = searchDocs(
      [
        {
          slug: 'x',
          title: 'Backup',
          section: 'Gestão',
          heading: null,
          anchor: null,
          text: '',
        },
      ],
      'backup',
    );
    expect(r[0].snippet).toBe('Backup');
  });

  it('usa o heading como snippet quando não há corpo', () => {
    const r = searchDocs(
      [
        {
          slug: 'x',
          title: 'X',
          section: 'S',
          heading: 'Só título',
          anchor: 'so-titulo',
          text: '',
        },
      ],
      'título',
    );
    expect(r[0].snippet).toContain('Só título');
  });
});
