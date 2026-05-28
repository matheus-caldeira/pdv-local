import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = '/pdv-local/app/'

const SITE_BASE = '/pdv-local'

// Em dev, serve a landing.html na raiz reescrevendo os caminhos relativos
// `app/...` e `docs/...` para os caminhos do site, reproduzindo producao
// (onde a landing fica em /, o app em /app e a docs em /docs). Nao afeta o build.
function serveLandingInDev(): Plugin {
  return {
    name: 'serve-landing-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url === '/' || url === '/pdv-local/' || url === '/pdv-local/index.html') {
          const html = readFileSync(resolve(__dirname, 'landing.html'), 'utf-8')
            .replace(/(src|href)="app\//g, `$1="${BASE}`)
            .replace(/(href)="docs\//g, `$1="${SITE_BASE}/docs/`)
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
          return
        }
        next()
      })
    },
  }
}

// Em dev, serve o conteudo markdown da documentacao a partir de docs/guide/,
// e serve o index.html da SPA para as rotas /pdv-local/docs/* (para o
// roteamento client-side funcionar sem 404 do dev server). Nao afeta o build.
function serveDocsInDev(): Plugin {
  return {
    name: 'serve-docs-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]

        // Conteudo markdown: /pdv-local/docs-content/<slug>.md -> docs/guide/<slug>.md
        const contentPrefix = `${SITE_BASE}/docs-content/`
        if (url.startsWith(contentPrefix) && url.endsWith('.md')) {
          const slug = url.slice(contentPrefix.length, -'.md'.length)
          // Evita path traversal: slug so pode ter [a-z0-9-]
          if (!/^[a-z0-9-]+$/.test(slug)) { res.statusCode = 400; res.end(); return }
          try {
            const md = readFileSync(resolve(__dirname, 'docs/guide', `${slug}.md`), 'utf-8')
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
            res.end(md)
          } catch {
            res.statusCode = 404
            res.end()
          }
          return
        }

        // Rotas da SPA da docs: /pdv-local/docs ou /pdv-local/docs/<algo>
        // (mas NAO /docs-content). Serve o index.html do app, passando pela
        // transformacao do Vite para que os modulos (/src/main.tsx) e o HMR
        // sejam reescritos corretamente em dev.
        if (url === `${SITE_BASE}/docs` || url.startsWith(`${SITE_BASE}/docs/`)) {
          const raw = readFileSync(resolve(__dirname, 'index.html'), 'utf-8')
          const html = await server.transformIndexHtml(req.url || '/', raw)
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveLandingInDev(), serveDocsInDev()],
  base: BASE,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
})
