# Arquitetura — PDV Local

Este documento descreve o **padrão-alvo** de arquitetura do projeto. O código
atual (páginas falando direto com o Dexie) será migrado para cá de forma
incremental. Documentos relacionados:

- [`design-system.md`](./design-system.md) — a identidade visual ("Balcão Digital").
- [`atomic-design.md`](./atomic-design.md) — a organização da camada de UI.

## Objetivo

O projeto nasceu local-first (dados no IndexedDB, via Dexie). Queremos que ele
**escale para múltiplos providers de persistência** — o usuário poderá conectar
seu próprio banco online (Postgres, Supabase, Firebase, Mongo) sem que o resto
do sistema saiba. Os dados continuam acessíveis a partir do navegador; como o
uso é individual, a exposição no cliente é aceitável.

Para isso adotamos **DDD (Domain-Driven Design)** com quatro camadas, o padrão
**Repository + Unit of Work** para a persistência, **use cases** para a regra de
negócio, e **`Either` + uma hierarquia de erros tipados** para o tratamento de
falhas.

## Princípio central

> A UI nunca fala com o banco. Ela chama **use cases** da camada de aplicação,
> que orquestram **repositories** através do **Unit of Work**, que delega ao
> **provider** ativo (Dexie hoje; Supabase/Postgres/Firebase/Mongo no futuro).

```
UI (atoms → pages)  →  hooks  →  Application (use cases)  →  Domain (entidades + regras)
                                        │
                                        ▼
                               Repositories (interfaces)  ←  Unit of Work
                                        │
                               Provider ativo (Dexie | Supabase | Postgres | ...)
```

A regra de dependência aponta **para dentro**: `domain` não conhece ninguém;
`application` conhece `domain`; `infrastructure` implementa as interfaces de
`domain`; `ui` e `app` ficam na borda. Trocar de provider não toca em `domain`
nem em `application`.

---

## Estrutura de pastas

```
src/
├── domain/                    # Núcleo — sem React, sem Dexie, sem libs externas
│   ├── product/
│   │   ├── product.entity.ts          # tipo Product + invariantes
│   │   ├── product.rules.ts           # regras puras (ex: validar estoque)
│   │   └── product.repository.ts      # INTERFACE do repository
│   ├── order/
│   │   ├── order.entity.ts
│   │   ├── order.rules.ts             # calcularTotal, validarCustomizacoes
│   │   └── order.repository.ts
│   ├── customer/  ...
│   ├── cash/      ...                 # Session + CashMovement
│   ├── config/    ...                 # BusinessConfig + regras de comanda
│   └── shared/
│       ├── either.ts                  # Either<E, A> mínimo
│       ├── errors.ts                  # AppError abstrato + bases por camada
│       ├── unit-of-work.ts            # INTERFACE do UoW
│       └── repositories.ts            # mapa { products, orders, ... }
│
├── application/               # Use cases — orquestram domínio + repos + UoW
│   ├── order/
│   │   ├── finalizar-pedido.usecase.ts
│   │   └── avancar-estagio.usecase.ts
│   ├── cash/
│   │   ├── abrir-caixa.usecase.ts
│   │   └── fechar-caixa.usecase.ts
│   ├── errors.ts                      # ApplicationError + erros desta camada
│   └── ...
│
├── infrastructure/            # Implementações concretas dos providers
│   ├── dexie/
│   │   ├── dexie-database.ts          # o schema Dexie atual vive aqui
│   │   ├── dexie-unit-of-work.ts      # db.transaction('rw', ...)
│   │   ├── dexie-errors.ts            # tradução de erro nativo → InfrastructureError
│   │   └── repositories/              # DexieProductRepository, etc.
│   ├── supabase/             # (futuro)
│   ├── firebase/             # (futuro)
│   ├── errors.ts                      # InfrastructureError + erros desta camada
│   └── provider-registry.ts           # escolhe o provider ativo
│
├── ui/                        # Atomic design (ver atomic-design.md)
│   ├── atoms/  molecules/  organisms/  templates/  pages/
│   ├── hooks/                          # ponte React → use cases
│   └── styles/                         # tokens/tema (ver design-system.md)
│
└── app/                       # composition root: rotas, providers React, DI
    ├── App.tsx
    └── container.ts                    # injeta o provider ativo nos use cases
```

`domain/` e `application/` **não importam React nem Dexie**. Trocar de provider
= mexer em `infrastructure/` + uma linha no `provider-registry`.

---

## Camadas

### Domain — núcleo puro

Entidades como tipos + invariantes, e **regras puras** testáveis sem banco nem
React. Migra o que hoje está espalhado:

- `order.rules.ts` ← cálculo de total, total de customização, validação de
  grupos obrigatórios (hoje dentro de `PDV.tsx`).
- `config.rules.ts` ← `nextTicketCounter` / `formatTicket` (hoje em
  `utils/format.ts`).

Cada agregado expõe uma **interface** de repository. O domínio define o
contrato; não sabe quem implementa.

```ts
// domain/order/order.repository.ts
import type { Either } from '../shared/either';
import type { InfrastructureError } from '../../infrastructure/errors';
import type { Order } from './order.entity';

export interface OrderRepository {
  create(order: NewOrder): Promise<Either<InfrastructureError, Order>>;
  update(
    id: number,
    patch: Partial<Order>,
  ): Promise<Either<InfrastructureError, Order>>;
  findBySession(
    sessionId: number,
  ): Promise<Either<InfrastructureError, Order[]>>;
}
```

### Application — use cases

Cada operação de negócio é um use case que recebe os repositories/UoW por
**injeção** (factory function — combina com o estilo funcional do React 19).
Use cases retornam `Either`.

```ts
// application/order/finalizar-pedido.usecase.ts
import { calcularTotalPedido } from '../../domain/order/order.rules';
import type { UnitOfWork } from '../../domain/shared/unit-of-work';

export function makeFinalizarPedido(uow: UnitOfWork) {
  return async (input: FinalizarPedidoInput) => {
    const total = calcularTotalPedido(input.items); // regra pura (domain)
    return uow.run(async (repos) => {
      // tudo-ou-nada
      const ticket = await repos.config.claimTicket();
      const customerId = await repos.customers.findOrCreate(input.customer);
      await repos.products.decrementStock(input.items);
      return repos.orders.create({ ...input, total, ticket, customerId });
    });
    // → Either<InfrastructureError | DomainError | ApplicationError, Order>
  };
}
```

### Infrastructure — providers

Cada provider implementa as interfaces de `domain`. Responsabilidade crítica:
**traduzir o erro nativo do driver para um erro tipado** — nunca deixar vazar
um erro cru do Dexie/Supabase para cima.

```ts
// infrastructure/dexie/repositories/dexie-product.repository.ts
async decrementStock(items) {
  try {
    // ...db.products...
    return right(undefined)
  } catch (e) {
    return left(toInfrastructureError(e))   // ConnectorError, UniqueConstraintError...
  }
}
```

O `provider-registry` decide qual provider está ativo, a partir da configuração
local do usuário (ex: "usar Dexie" vs. "conectar Supabase com esta URL/chave").

### UI → hooks → use cases

A ponte fica em `ui/hooks/`. O hook não conhece banco; só chama o use case
resolvido pelo container.

```ts
// ui/hooks/useFinalizarPedido.ts
const finalizar = useUseCase((c) => c.finalizarPedido);
```

### Composition root — `app/container.ts`

Único lugar que conhece concretos: lê o provider ativo, instancia repositories +
UoW, monta os use cases e os injeta. **Trocar de provider = trocar aqui.**

---

## Unit of Work (UoW)

Agrupa **várias escritas numa única transação atômica**: ou tudo é gravado, ou
nada. Resolve um problema que já temos hoje e que **piora com providers
remotos** — finalizar um pedido toca em vários agregados (cria `Order`, baixa
`stock`, reserva a comanda, futuramente lança no caixa). Sem UoW, uma falha no
meio (ou queda de rede) deixa o estado inconsistente.

```ts
// domain/shared/unit-of-work.ts
export interface UnitOfWork {
  run<A>(
    work: (repos: Repositories) => Promise<Either<AppError, A>>,
  ): Promise<Either<AppError, A>>;
}
```

Cada provider implementa `run` à sua maneira:

| Provider          | Implementação de `run`              |
| ----------------- | ----------------------------------- |
| Dexie (IndexedDB) | `db.transaction('rw', ...)`         |
| Postgres/Supabase | `BEGIN ... COMMIT / ROLLBACK`       |
| Firebase          | `runTransaction()` / batched writes |
| Mongo             | sessão com transação                |

**UoW + Either:** dentro do `uow.run`, retornar um `Left` **aborta a transação e
dispara rollback** — sem `throw` no fluxo de negócio. O `run` propaga esse
`Left` tipado para fora. O adapter de cada provider é responsável por converter
"recebi um `Left`" no rollback real do driver.

---

## Tratamento de erros — `Either` + hierarquia tipada

### `Either<E, A>`

Toda operação que pode falhar retorna `Either` em vez de lançar exceção. `Left`
= erro tipado; `Right` = sucesso. O erro faz parte da **assinatura** da função,
então o compilador obriga o consumidor a tratá-lo.

Usamos uma **implementação própria mínima** (sem dependência nova):

```ts
// domain/shared/either.ts
export type Either<E, A> = Left<E> | Right<A>;

export const left = <E>(e: E): Either<E, never> => ({ _tag: 'Left', left: e });
export const right = <A>(a: A): Either<never, A> => ({
  _tag: 'Right',
  right: a,
});

export const isLeft = <E, A>(e: Either<E, A>): e is Left<E> =>
  e._tag === 'Left';
export const isRight = <E, A>(e: Either<E, A>): e is Right<A> =>
  e._tag === 'Right';

// map, flatMap, fold — encadeamento sem desempacotar manualmente
```

### `AppError` — raiz abstrata

Toda classe de erro tratado herda de `AppError`. O que **não** herda dela é um
erro inesperado — o caso "500".

```ts
// domain/shared/errors.ts
export abstract class AppError {
  abstract readonly code: string; // 'DB_CONNECTOR', 'AUTH_WRONG_PASSWORD'...
  abstract readonly layer: 'domain' | 'application' | 'infrastructure';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}
```

### Erros por camada

Cada camada tem sua própria base (intermediária) e sua lista. Quanto mais
granular, melhor o tratamento na UI.

```ts
// infrastructure/errors.ts — InfrastructureError extends AppError
ConnectorError; // não conectou ao provider
WrongPasswordError; // credencial inválida
ConnectionTimeoutError;
ProviderUnavailableError;
RecordNotFoundError;
UniqueConstraintError; // ex: telefone de cliente duplicado
TransactionFailedError; // UoW rollback

// domain/errors.ts — DomainError extends AppError
InvalidOrderError;
EmptyCartError;
RequiredCustomizationMissingError;
InsufficientStockError;
TicketLimitReachedError;

// application/errors.ts — ApplicationError extends AppError
SessionClosedError;
NoActiveSessionError;
OperationNotAllowedError;
```

### Fluxo do erro pelas camadas

1. **Provider** captura o erro nativo do driver e o **traduz** para um
   `InfrastructureError` tipado → `left(new ConnectorError(...))`.
2. **Use case** recebe `Either` dos repositories, encadeia com `flatMap`, e
   adiciona seus próprios `ApplicationError` quando a orquestração falha.
3. **Borda (hook/UI)** faz `fold`: se for `AppError`, mostra uma mensagem
   tratada conforme o `code`; se for qualquer outra coisa (não-`AppError`), é o
   caso "500" — log + toast genérico "erro inesperado".

```ts
fold(
  result,
  (err) =>
    err instanceof AppError
      ? toast.error(mensagemPara(err.code)) // tratado
      : reportUnexpected(err), // "500"
  (order) => navigate(`/orders/${order.id}`),
);
```

---

## Fluxo de dados — finalizar pedido (exemplo completo)

```
PDV.tsx
  → useFinalizarPedido (hook)
    → finalizarPedido (use case)
        → calcularTotalPedido (domain, puro)
        → uow.run(
            config.claimTicket,
            customers.findOrCreate,
            products.decrementStock,
            orders.create,
          )
          → provider ativo (Dexie hoje) → commit / rollback
      → Either<AppError, Order>
  → fold → navega ou mostra erro tratado
```

---

## Estratégia de migração (incremental, sem big bang)

O `database.ts` atual continua funcionando enquanto migramos **agregado por
agregado**:

1. Criar `domain/shared` (`either`, `errors`, `unit-of-work`, `repositories`).
2. Para cada agregado: extrair entidade + regras puras; definir a interface do
   repository; implementar o `DexieRepository` correspondente em cima do
   `db` atual.
3. Criar os use cases das operações de negócio, movendo a regra de dentro das
   páginas (ex: `PDV.tsx`) para `application/`.
4. Montar `app/container.ts` e os hooks `ui/hooks/`.
5. Migrar uma página por vez para consumir use cases em vez de `db` direto.
6. Quando todas as páginas estiverem migradas, o `database.ts` antigo deixa de
   ser importado fora de `infrastructure/dexie/`.

---

## Testes

| Camada         | Como testar                                                              |
| -------------- | ------------------------------------------------------------------------ |
| Domain         | Funções puras — entrada/saída, sem mocks.                                |
| Application    | Use cases com **repository fake em memória** (sem IndexedDB).            |
| Infrastructure | Implementações reais contra o driver (Dexie em ambiente de teste).       |
| UI             | Ver [`atomic-design.md`](./atomic-design.md) — hooks/use cases mockados. |

Como tudo retorna `Either`, os testes verificam `isLeft`/`isRight` e o `code` do
erro, sem `try/catch`.
