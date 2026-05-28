// O site é servido sob /pdv-local no GitHub Pages. Em dev, o Vite usa
// base /pdv-local/app/, mas a docs responde em /pdv-local/docs. Derivamos
// o "site base" tirando o último segmento (/app) do BASE_URL do Vite.
const VITE_BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // ex: /pdv-local/app
export const SITE_BASE = VITE_BASE.replace(/\/[^/]+$/, '') // ex: /pdv-local
export const APP_BASE = VITE_BASE // ex: /pdv-local/app
export const DOCS_BASE = `${SITE_BASE}/docs` // ex: /pdv-local/docs

// Decide o basename do BrowserRouter conforme a URL atual. A docs e o app
// compartilham o mesmo bundle; o prefixo do caminho diz qual área está ativa.
export function resolveBasename(pathname: string): string {
  return pathname.startsWith(DOCS_BASE) ? DOCS_BASE : APP_BASE
}

// URL absoluta (relativa ao site) de um arquivo de conteúdo da docs.
export function docsContentUrl(slug: string): string {
  return `${SITE_BASE}/docs-content/${slug}.md`
}
