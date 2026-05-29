# CLAUDE.md

Guia para agentes trabalhando neste repositório. Leia antes de tocar no código.

## O que é o PDV Local

Ponto de venda gratuito, **offline-first**, que roda no navegador e é pensado
para o celular. Vendas, caixa, cozinha (KDS), painel do cliente, produtos com
adicionais, clientes, relatórios e backup — tudo salvo localmente no aparelho
(IndexedDB via Dexie), **sem servidor, sem mensalidade e sem cadastro**.

- **App:** https://matheus-caldeira.github.io/pdv-local/app/
- **Docs (uso):** https://matheus-caldeira.github.io/pdv-local/docs/
- **Landing:** https://matheus-caldeira.github.io/pdv-local/

## Stack

- Vite 8 + React 19 + TypeScript
- Dexie (IndexedDB) para persistência local
- react-router-dom 7 para roteamento
- Tailwind + CVA + `cn()` (clsx + tailwind-merge) para a UI
- react-markdown (+ remark-gfm, rehype-slug) para a documentação
- lucide-react para ícones

## Comandos

```bash
npm install
npm run dev      # servidor de desenvolvimento (Vite)
npm run build    # tsc -b + vite build → dist/
npm run preview  # serve o build localmente
npm run lint     # eslint
npm run test     # suíte de testes
```

Em dev:

- Landing: http://localhost:5173/
- App: http://localhost:5173/pdv-local/app/
- Docs: http://localhost:5173/pdv-local/docs/

## As três áreas de URL

Tudo sob a base `/pdv-local/` no GitHub Pages. O **app e a documentação usam o
mesmo bundle** — a SPA decide o `basename` do roteador em runtime conforme o
prefixo da URL. Ver `src/lib/docsBase.ts` e `src/App.tsx`.

| URL       | Conteúdo           | Origem                         |
| --------- | ------------------ | ------------------------------ |
| `/`       | Landing page       | `landing.html`                 |
| `/app/*`  | App React (SPA)    | build do Vite (`dist/`)        |
| `/docs/*` | Documentação (SPA) | mesmo bundle, basename runtime |

Detalhes em [`docs/site-structure.md`](./docs/site-structure.md).

---

## Arquitetura — DDD em 4 camadas

A documentação canônica vive em `docs/`. Resumo operacional:

- **Princípio central:** a UI **nunca** fala com o banco. Ela chama **use cases**
  (application), que orquestram **repositories** via **Unit of Work**, que delega
  ao **provider** ativo (Dexie hoje; Supabase/Postgres/Firebase/Mongo no futuro).
- **Regra de dependência aponta para dentro:** `domain` não conhece ninguém;
  `application` conhece `domain`; `infrastructure` implementa as interfaces de
  `domain`; `ui` e `app` ficam na borda.
- `domain/` e `application/` **não importam React nem Dexie**.

Estrutura de `src/`:

```
domain/          # núcleo puro: entidades, regras, INTERFACES de repository
application/     # use cases (orquestram domínio + repos + UoW), retornam Either
infrastructure/  # providers concretos (dexie/, supabase/...) + tradução de erros
ui/              # atomic design: atoms/ molecules/ organisms/ templates/ pages/ + hooks/ + styles/
app/             # composition root: rotas, providers React, container (DI)
```

- **Either + erros tipados:** toda operação que pode falhar retorna
  `Either<E, A>` (sem `throw` no fluxo de negócio). Erros herdam de `AppError`
  com `code` e `layer`; o que não herda de `AppError` é o caso "500" inesperado.
  A borda faz `fold` no `Either`.
- **Unit of Work:** agrupa várias escritas numa transação atômica (tudo-ou-nada).
  Um `Left` dentro do `uow.run` aborta e dispara rollback.

Camadas e papéis completos: [`docs/architecture.md`](./docs/architecture.md).

### UI — Atomic Design + design system

- **Atomic design** (Brad Frost) sobre **Tailwind + CVA + `cn()`**
  (clsx + tailwind-merge). Direção de dependência: `pages → templates →
organisms → molecules → atoms` (nunca o contrário).
- **Organisms** são os únicos cientes de feature: usam **hooks → use cases** e
  fazem `fold` no `Either`. **Nunca importam `db` nem repositories direto.**
- **Design system "Balcão Digital":** cores/tipografia/espaço/raio vêm **sempre**
  dos tokens em `src/styles/tokens.css` (expostos ao Tailwind via `@theme`).
  **Sem `#hex`, sem `slate-*`/azul genérico, sem valores arbitrários** em
  componente. Dinheiro/comanda/quantidade sempre em `font-mono tabular-nums`.

Referências: [`docs/atomic-design.md`](./docs/atomic-design.md) e
[`docs/design-system.md`](./docs/design-system.md).

---

## IMPORTANTE — Testes: tudo testado, cobertura 100%

> **Padrão obrigatório: todo código deve ser testado, mirando 100% de
> cobertura.** Nenhuma feature ou correção é considerada concluída sem testes
> que a cubram. Código novo entra **com** seus testes.

Como testar cada camada (ver `docs/architecture.md` e `docs/atomic-design.md`):

| Camada         | Como testar                                                                |
| -------------- | -------------------------------------------------------------------------- |
| Domain         | Funções puras — entrada/saída, **sem mocks**.                              |
| Application    | Use cases com **repository fake em memória** (sem IndexedDB).              |
| Infrastructure | Implementações reais contra o driver (Dexie em ambiente de teste).         |
| UI (organisms) | Integração com **hooks/use cases mockados**; estados loading/erro/sucesso. |
| UI (pages)     | Integração compondo template + organisms.                                  |

- Como tudo retorna `Either`, os testes verificam `isLeft`/`isRight` e o `code`
  do erro — **sem `try/catch`**.
- Testes de UI usam React Testing Library, consultando por papéis ARIA e labels
  (`getByRole`, `getByLabelText`) — não por detalhes de implementação.

---

## Estrutura de pastas

```
src/
  domain/         núcleo puro: entidades, regras, interfaces de repository
  application/    use cases (retornam Either)
  infrastructure/ providers concretos (dexie/, ...) + tradução de erros
  ui/             atoms/ molecules/ organisms/ templates/ pages/ + hooks/ + styles/
  app/            composition root: rotas, providers React, container (DI)
docs/
  guide/          conteúdo markdown da documentação (PÚBLICO)
  *.md            documentos de arquitetura (INTERNOS, não publicados)
public/           assets estáticos, 404.html
landing.html      landing page (servida em /)
```

## Documentação

- **Usuário final:** `docs/guide/*.md`, renderizado em `/docs`. A ordem e os
  títulos da navegação vêm do manifesto em `docs/guide/`. **Apenas** os `.md` de
  `docs/guide/` são publicados.
- **Interno (arquitetura):** `docs/architecture.md`, `docs/atomic-design.md`,
  `docs/design-system.md`, `docs/site-structure.md` — **não** são publicados.
- Em dev, um middleware do Vite (`serveDocsInDev` em `vite.config.ts`) serve
  `docs/guide/` em `/pdv-local/docs-content/<slug>.md`. Em prod, o workflow copia
  para `_site/docs-content/`.

## Deploy

Push na branch `main` dispara `.github/workflows/deploy.yml`: faz o build, monta
`_site/` (landing em `/`, app em `/app`, docs em `/docs`, conteúdo em
`/docs-content`) e publica no GitHub Pages. **Push em `main` = deploy em
produção** — tenha cuidado.

## Princípios de código (obrigatórios)

- **SOLID, DDD e Clean Architecture** orientam todo código novo. A regra de
  dependência aponta para dentro (ver Arquitetura acima); cada unidade tem uma
  responsabilidade única e é testável de forma isolada.
- **Nunca escrever comentários em código.** O código deve ser autoexplicativo
  (nomes claros, funções pequenas). Sem comentários de "o que faz", sem
  docstrings, sem blocos explicativos. A única exceção é quando um comentário é
  exigido por ferramenta (ex.: diretiva de lint).
- **Todo código em inglês:** identificadores (variáveis, funções, tipos,
  arquivos), e qualquer string interna. **Texto voltado ao usuário** (UI,
  documentação, mensagens de erro exibidas) continua em **Português**.

## Fluxo obrigatório antes de concluir

Sempre rodar, e deixar verde, antes de considerar qualquer tarefa pronta:

```bash
npm run format   # prettier --write
npm run lint     # eslint (sem erros)
npm run test     # vitest (tudo passando, cobertura 100% nas camadas)
```

Atalho: `npm run check` roda os três em sequência. Nenhuma feature ou correção é
concluída sem `format` + `lint` + `test` verdes.

## Convenções de trabalho

- **Idioma:** texto de UI, documentação e mensagens de commit em **Português**
  (com acentuação correta). **Código em inglês** (ver Princípios acima).
- **Commits:** crie commits apenas quando solicitado. NÃO faça push sem pedido
  explícito (push em `main` publica em produção).
- **Não instalar dependências/software** sem confirmação explícita do usuário.
- **Specs/planos/brainstorm vivem em `.superpowers/`** (já no `.gitignore`),
  **nunca** na pasta `docs/`. `docs/` é só documentação do projeto (arquitetura
  interna + guia público). Artefatos de processo do superpowers não são
  commitados.
