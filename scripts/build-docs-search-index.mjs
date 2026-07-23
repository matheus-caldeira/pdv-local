import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntriesForPage } from '../src/domain/docs/search-index.ts';
import { DOCS_PAGES } from '../docs/guide/manifest.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function generateIndex() {
  return DOCS_PAGES.flatMap((page) => {
    const md = readFileSync(
      resolve(root, 'docs/guide', `${page.slug}.md`),
      'utf-8',
    );
    return buildEntriesForPage(page, md);
  });
}

const outArg = process.argv[2];
if (outArg) {
  writeFileSync(outArg, JSON.stringify(generateIndex()), 'utf-8');
}
