import GithubSlugger from 'github-slugger';

export interface DocSearchEntry {
  slug: string;
  title: string;
  section: string;
  heading: string | null;
  anchor: string | null;
  text: string;
}

export function slugifyHeading(heading: string): string {
  return new GithubSlugger().slug(heading);
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^[#>\-*\d.\s]+/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]/g, '')
    .trim();
}

export function buildEntriesForPage(
  meta: { slug: string; title: string; section: string },
  markdown: string,
): DocSearchEntry[] {
  const lines = markdown.split('\n');
  const slugger = new GithubSlugger();
  const entries: DocSearchEntry[] = [];
  let current: DocSearchEntry = {
    slug: meta.slug,
    title: meta.title,
    section: meta.section,
    heading: null,
    anchor: null,
    text: '',
  };
  const push = () => {
    current.text = current.text.trim();
    if (current.text || current.heading) entries.push(current);
  };
  for (const line of lines) {
    if (/^#\s+/.test(line)) continue;
    const hx = /^#{2,}\s+(.*)$/.exec(line);
    if (hx) {
      push();
      const heading = hx[1].trim();
      current = {
        slug: meta.slug,
        title: meta.title,
        section: meta.section,
        heading,
        anchor: slugger.slug(heading),
        text: '',
      };
      continue;
    }
    const clean = stripMarkdown(line);
    if (clean) current.text += (current.text ? ' ' : '') + clean;
  }
  push();
  return entries;
}
