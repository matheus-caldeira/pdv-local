const VITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const SITE_BASE = VITE_BASE.replace(/\/[^/]+$/, '');
export const APP_BASE = VITE_BASE;
export const DOCS_BASE = `${SITE_BASE}/docs`;

export function resolveBasename(pathname: string): string {
  return pathname === DOCS_BASE || pathname.startsWith(`${DOCS_BASE}/`)
    ? DOCS_BASE
    : APP_BASE;
}

export function docsContentUrl(slug: string): string {
  return `${SITE_BASE}/docs-content/${slug}.md`;
}
