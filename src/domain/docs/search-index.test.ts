import { describe, expect, it } from 'vitest';
import { buildEntriesForPage, slugifyHeading } from './search-index';

const meta = { slug: 'caixa', title: 'Caixa', section: 'No dia a dia' };

describe('slugifyHeading', () => {
  it('normaliza acentos e espaços como o rehype-slug', () => {
    expect(slugifyHeading('Abrir o caixa')).toBe('abrir-o-caixa');
    expect(slugifyHeading('Conciliar a fatura')).toBe('conciliar-a-fatura');
  });
});

describe('buildEntriesForPage', () => {
  it('cria uma entrada para a intro e uma por heading', () => {
    const md = [
      '# Caixa',
      '',
      'Controla o dinheiro do dia.',
      '',
      '## Abrir o caixa',
      '',
      'Toque em Abrir Caixa.',
    ].join('\n');
    const entries = buildEntriesForPage(meta, md);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      slug: 'caixa',
      title: 'Caixa',
      heading: null,
      anchor: null,
    });
    expect(entries[0].text).toContain('Controla o dinheiro do dia');
    expect(entries[1]).toMatchObject({
      heading: 'Abrir o caixa',
      anchor: 'abrir-o-caixa',
    });
    expect(entries[1].text).toContain('Toque em Abrir Caixa');
  });

  it('ignora o próprio H1 como heading de seção', () => {
    const entries = buildEntriesForPage(meta, '# Caixa\n\nIntro.');
    expect(entries.every((e) => e.heading !== 'Caixa')).toBe(true);
  });

  it('desconta marcação de links e listas no texto', () => {
    const md = [
      '## Ver também',
      '',
      '- Veja [Caixa](caixa) e **Vender**.',
    ].join('\n');
    const entries = buildEntriesForPage(meta, md);
    expect(entries[0].text).toBe('Veja Caixa e Vender.');
  });

  it('gera âncoras únicas para headings repetidos', () => {
    const md = ['## Passos', '', 'a', '', '## Passos', '', 'b'].join('\n');
    const entries = buildEntriesForPage(meta, md);
    expect(entries[0].anchor).toBe('passos');
    expect(entries[1].anchor).toBe('passos-1');
  });

  it('inclui heading sem texto e ignora seção totalmente vazia', () => {
    const md = ['# Caixa', '', '## Só título', '', '## Vazia'].join('\n');
    const entries = buildEntriesForPage(meta, md);
    expect(entries.map((e) => e.heading)).toEqual(['Só título', 'Vazia']);
    expect(entries[0].text).toBe('');
  });

  it('ignora markdown sem intro nem headings', () => {
    expect(buildEntriesForPage(meta, '')).toEqual([]);
    expect(buildEntriesForPage(meta, '# Caixa')).toEqual([]);
  });

  it('junta várias linhas de texto de uma seção com espaço', () => {
    const md = ['## Passos', '', 'primeira linha', 'segunda linha'].join('\n');
    const entries = buildEntriesForPage(meta, md);
    expect(entries[0].text).toBe('primeira linha segunda linha');
  });
});
