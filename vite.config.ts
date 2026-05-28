import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const BASE = '/pdv-local/app/'

// Em dev, serve a landing.html na raiz reescrevendo os caminhos relativos
// `app/...` para o base, reproduzindo o comportamento de producao (onde a
// landing fica em / e o app em /app). Nao afeta o build.
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
  plugins: [react(), serveLandingInDev()],
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
