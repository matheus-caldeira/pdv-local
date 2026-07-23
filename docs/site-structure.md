# Estrutura do Site — Landing, App e Docs

Descreve o **padrão-alvo** de como o projeto se organiza em três áreas de URL e
como elas são servidas (dev e GitHub Pages). É um documento de arquitetura; os
detalhes de implementação da documentação vivem no spec
[`.superpowers/specs/2026-05-28-documentacao-docs-design.md`](../.superpowers/specs/2026-05-28-documentacao-docs-design.md).

Relacionados: [`architecture.md`](./architecture.md) (a arquitetura DDD da SPA do
`/app`), [`design-system.md`](./design-system.md) e
[`atomic-design.md`](./atomic-design.md).

---

## As três áreas

Sob a base do GitHub Pages (`/meu-bolso/`):

| URL       | Conteúdo                 | Origem                        |
| --------- | ------------------------ | ----------------------------- |
| `/`       | Landing page             | `landing.html`                |
| `/app/*`  | Aplicação (SPA React)    | `dist/`                       |
| `/docs/*` | Documentação (SPA React) | mesma build do app + markdown |

A landing é HTML estático. O app e a documentação são **a mesma SPA React** —
não há um segundo build.

---

## Bundle único com basename dinâmico

Conceito central: **um só `index.html` / um só bundle** serve tanto `/app`
quanto `/docs`. O Vite gera assets com caminho absoluto
(`/meu-bolso/app/assets/...`), então o mesmo `index.html` funciona nas duas
áreas — os assets sempre carregam de `/meu-bolso/app/assets`.

A SPA escolhe o `basename` do `BrowserRouter` em **runtime**, conforme o prefixo
da URL atual:

```ts
const path = window.location.pathname;
const SITE_BASE = '/meu-bolso';
const basename = path.startsWith(`${SITE_BASE}/docs`)
  ? `${SITE_BASE}/docs`
  : `${SITE_BASE}/app`;
```

- Em `/meu-bolso/app/*` → basename `/meu-bolso/app` → rotas do app ativas.
- Em `/meu-bolso/docs/*` → basename `/meu-bolso/docs` → rotas de docs ativas.

As rotas de docs ficam **fora** do `<Route element={<Layout/>}>` do app, num
`DocsLayout` próprio, para não herdar a navegação do PDV.

---

## Conteúdo da documentação

A pasta `docs/` na raiz tem duas naturezas:

```
docs/
  guide/             ← PÚBLICO — vira /meu-bolso/docs-content/ no site
    _manifest.ts       lista ordenada (slug, título, seção) → monta a sidebar
    *.md               páginas do guia (uma por tópico)
  architecture.md    ← INTERNO (não publicado)
  design-system.md   ← INTERNO (não publicado)
  atomic-design.md   ← INTERNO (não publicado)
  site-structure.md  ← INTERNO (este arquivo)
```

- Só `docs/guide/` é publicada. Os documentos de arquitetura (este, mais
  `architecture`, `design-system`, `atomic-design`) ficam em `docs/` mas **não**
  vão para o site.
- O **manifesto** (`.ts`, versionado no bundle) é a fonte de verdade da
  navegação — não dá para listar diretório em runtime no GitHub Pages. Ele lista
  títulos/slugs; o **corpo** de cada página vem por `fetch` do `.md`.

### Caminho de fetch único (dev + prod)

```ts
const url = `/meu-bolso/docs-content/${slug}.md`;
```

- **Prod:** o workflow copia `docs/guide/` para `_site/docs-content/`, e a URL
  resolve nativamente.
- **Dev:** um middleware no `vite.config.ts` (`serveDocsInDev`, análogo ao
  `serveLandingInDev` já existente) intercepta `/meu-bolso/docs-content/<slug>.md`
  e serve o arquivo de `docs/guide/<slug>.md` direto do disco — dispensa symlink.

---

## Deploy (GitHub Pages)

O workflow monta `_site` a partir dos artefatos:

```
_site/
  index.html        ← landing (landing.html)
  404.html          ← fallback de deep-link da SPA
  app/              ← dist/ (a SPA)
  docs/             ← cópia do index.html da SPA (basename /docs em runtime)
  docs-content/     ← docs/guide/ (markdown público)
```

### Fallback de rota (`public/404.html`)

O GitHub Pages devolve `404.html` para caminhos sem arquivo físico. Ele
reconhece **dois** prefixos como deep-link da SPA e reencaminha mantendo os dois
segmentos de base:

- `/meu-bolso/app/<rota>` → SPA (área app).
- `/meu-bolso/docs/<rota>` → SPA (área docs).
- qualquer outro caminho → landing em `/meu-bolso/`.

---

## Pontos de entrada entre as áreas

- **Landing → app/docs:** links no header e no footer da `landing.html`.
- **App → docs:** link "Documentação" no menu "Mais" (`ContactModal`).
- **Docs → app/landing:** o `DocsLayout` tem "Abrir o app" (`/meu-bolso/app/`) e
  "Voltar ao site" (`/meu-bolso/`).

---

## Resumo da relação entre as áreas

- A **landing** é a porta de entrada estática (marketing).
- O **app** é a SPA React que segue a arquitetura DDD descrita em
  [`architecture.md`](./architecture.md), com a UI em
  [`atomic-design.md`](./atomic-design.md) sobre o
  [`design-system.md`](./design-system.md).
- A **documentação** reaproveita a mesma SPA (mesmo bundle, mesmos tokens), só
  troca o layout (`DocsLayout`) e renderiza markdown — focada no usuário final.
