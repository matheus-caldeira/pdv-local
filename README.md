# PDV Local

Ponto de venda gratuito que roda no navegador, **offline-first**, pensado para o
celular. Vendas, caixa, cozinha (KDS), painel do cliente, produtos com
adicionais, clientes, relatórios e backup — tudo salvo localmente no aparelho
(IndexedDB), sem servidor, sem mensalidade e sem cadastro.

- **Site:** https://matheus-caldeira.github.io/pdv-local/
- **App:** https://matheus-caldeira.github.io/pdv-local/app/
- **Documentação (uso):** https://matheus-caldeira.github.io/pdv-local/docs/

## Stack

- [Vite 8](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript
- [Dexie](https://dexie.org/) (IndexedDB) para persistência local
- [react-router-dom 7](https://reactrouter.com/) para roteamento
- [react-markdown](https://github.com/remarkjs/react-markdown) para a documentação
- [lucide-react](https://lucide.dev/) para ícones

Para contribuir, leia o [`CLAUDE.md`](./CLAUDE.md) (guia de arquitetura, padrão
de testes e convenções) antes de tocar no código.

## Rodando localmente

```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # type-check + build de produção em dist/
npm run preview  # serve o build localmente
npm run lint     # eslint
```

Em dev:

- Landing: http://localhost:5173/
- App: http://localhost:5173/pdv-local/app/
- Documentação: http://localhost:5173/pdv-local/docs/

## As três áreas de URL

O site tem três áreas, todas sob a base `/pdv-local/` no GitHub Pages:

| URL        | Conteúdo            | Origem                         |
|------------|---------------------|--------------------------------|
| `/`        | Landing page        | `landing.html`                 |
| `/app/*`   | App React (SPA)     | build do Vite (`dist/`)        |
| `/docs/*`  | Documentação (SPA)  | mesmo bundle, basename runtime |

- **Bundle único:** o app e a documentação usam o mesmo build. A SPA decide o
  `basename` do roteador em tempo de execução conforme o prefixo da URL
  (`/pdv-local/app` ou `/pdv-local/docs`) — ver `src/lib/docsBase.ts` e
  `src/App.tsx`.
- **Persistência:** toda a informação fica em IndexedDB via Dexie
  (`src/db/database.ts`). Não há backend.
- **Roteamento no GitHub Pages:** como o Pages não conhece rotas de SPA, o
  `public/404.html` reescreve deep links de `/app` e `/docs` para o `index.html`
  restaurar a rota (técnica do `?/`).

Detalhes em [`docs/site-structure.md`](./docs/site-structure.md).

## Arquitetura da SPA

A SPA segue **DDD em quatro camadas** com **Repository + Unit of Work** para
persistência, **use cases** para a regra de negócio e **`Either` + erros
tipados** para o tratamento de falhas. O objetivo é poder trocar o provider de
persistência (Dexie hoje; Supabase/Postgres/Firebase/Mongo no futuro) sem tocar
no domínio nem na aplicação.

```
domain/          núcleo puro: entidades, regras, INTERFACES de repository
application/     use cases (orquestram domínio + repos + UoW), retornam Either
infrastructure/  providers concretos (dexie/, ...) + tradução de erros tipados
ui/              atomic design: atoms/molecules/organisms/templates/pages + hooks/styles
app/             composition root: rotas, providers React, container (DI)
```

**Princípio central:** a UI nunca fala com o banco — ela chama use cases, que
orquestram repositories via Unit of Work, que delega ao provider ativo. A regra
de dependência aponta para dentro: `domain` não conhece ninguém; `domain/` e
`application/` não importam React nem Dexie.

A UI segue **Atomic Design** sobre **Tailwind + CVA + `cn()`**, consumindo os
tokens do design system **"Balcão Digital"** (`src/styles/tokens.css`) — sem
`#hex` ou cor genérica em componente.

Documentação canônica:

- [`docs/architecture.md`](./docs/architecture.md) — camadas DDD, UoW, Either, erros.
- [`docs/atomic-design.md`](./docs/atomic-design.md) — organização da UI.
- [`docs/design-system.md`](./docs/design-system.md) — identidade visual e tokens.

## Testes

> ✅ **Padrão obrigatório: todo código deve ser testado, mirando 100% de
> cobertura.** Nenhuma feature ou correção é concluída sem testes. Código novo
> entra com seus testes.

| Camada         | Como testar                                                       |
|----------------|-------------------------------------------------------------------|
| Domain         | Funções puras — entrada/saída, sem mocks.                         |
| Application    | Use cases com repository fake em memória (sem IndexedDB).         |
| Infrastructure | Implementações reais contra o driver (Dexie em ambiente de teste).|
| UI             | React Testing Library; hooks/use cases mockados; consultas por ARIA. |

Como tudo retorna `Either`, os testes verificam `isLeft`/`isRight` e o `code` do
erro, sem `try/catch`.

## Estrutura de pastas

```
src/
  components/   Layout, modais, toast
  pages/        uma pasta/arquivo por tela do app
  pages/docs/   layout e página da documentação
  db/           Dexie (schema, migrations, export/import)
  hooks/        hooks compartilhados (sessão de caixa)
  lib/          helpers (base de URL da docs)
  utils/        formatação, regras de pedido
  styles/       tokens de design
docs/
  guide/        conteúdo markdown da documentação (PÚBLICO)
  *.md          documentos internos (não publicados)
public/         assets estáticos, 404.html
landing.html    landing page (servida em /)
```

## Documentação

- **Usuário final:** `docs/guide/*.md`, renderizado em `/docs`. A ordem e os
  títulos da navegação vêm de `docs/guide/manifest.ts`. Apenas os `.md` de
  `docs/guide/` são publicados.
- **Interno:** outros arquivos em `docs/` (ex: notas de arquitetura) **não** são
  publicados.

Em dev, um middleware do Vite (`serveDocsInDev` em `vite.config.ts`) serve o
conteúdo de `docs/guide/` em `/pdv-local/docs-content/<slug>.md`. Em produção, o
workflow copia esses arquivos para `_site/docs-content/`.

## Deploy

Push na branch `main` dispara `.github/workflows/deploy.yml`, que faz o build,
monta `_site/` (landing em `/`, app em `/app`, docs em `/docs`, conteúdo em
`/docs-content`) e publica no GitHub Pages.
