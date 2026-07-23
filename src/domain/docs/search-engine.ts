import type { DocSearchEntry } from './search-index';

export interface DocSearchResult {
  slug: string;
  title: string;
  section: string;
  heading: string | null;
  anchor: string | null;
  snippet: string;
  score: number;
}

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function makeSnippet(text: string, term: string): string {
  const idx = normalize(text).indexOf(term);
  if (idx < 0) return text.slice(0, 100);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + term.length + 50);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end) +
    (end < text.length ? '…' : '')
  );
}

export function searchDocs(
  entries: DocSearchEntry[],
  query: string,
): DocSearchResult[] {
  const term = normalize(query.trim());
  if (term.length < 2) return [];
  const results: DocSearchResult[] = [];
  for (const entry of entries) {
    const inTitle = normalize(entry.title).includes(term);
    const inHeading = entry.heading
      ? normalize(entry.heading).includes(term)
      : false;
    const inText = normalize(entry.text).includes(term);
    if (!inTitle && !inHeading && !inText) continue;
    const score = (inTitle ? 3 : 0) + (inHeading ? 2 : 0) + (inText ? 1 : 0);
    results.push({
      slug: entry.slug,
      title: entry.title,
      section: entry.section,
      heading: entry.heading,
      anchor: entry.anchor,
      snippet: makeSnippet(entry.text || entry.heading || entry.title, term),
      score,
    });
  }
  return results.sort((a, b) => b.score - a.score);
}
