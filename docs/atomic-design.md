# Atomic Design — PDV Local

A camada de UI segue o atomic design de Brad Frost, sobre **Tailwind + CVA +
`cn()`**, consumindo a identidade definida em
[`design-system.md`](./design-system.md). A relação com o domínio segue
[`architecture.md`](./architecture.md): **organisms falam com o domínio apenas
via hooks → use cases, nunca com o banco direto.**

> Stack-alvo: Vite + React 19 + react-router + Tailwind + CVA + `cn()`
> (clsx + tailwind-merge). A migração a partir do CSS-por-página atual é
> incremental — ver "Migração do código atual".

```
src/ui/
├── atoms/        # Menores blocos indivisíveis (Button, Icon, Money, Badge)
├── molecules/    # Composição de 2+ atoms, ainda "burros" (Modal, Toast, FormField)
├── organisms/    # Componentes cientes de feature (usam hooks → use cases)
├── templates/    # Scaffolding de layout (Layout/AppShell)
└── pages/        # Composições de página inteira (consumidas pelas rotas)
```

A **regra de dependência**: um atom nunca importa de molecules para cima; uma
molecule nunca importa organisms; pages compõem templates + organisms. A
direção é sempre de cima (pages) para baixo (atoms).

---

## Camadas

### Atoms (`ui/atoms/`)

- **Propósito**: menores blocos indivisíveis.
- **Características**: responsabilidade única; sem estado quando possível
  (controlados por props); **sem lógica de negócio**; estilizados com Tailwind +
  `cn()` + variantes CVA mapeadas aos tokens do design system.

```tsx
// ui/atoms/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/ui/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        accent: 'bg-accent text-accent-text hover:bg-accent-hover',
        ghost:
          'bg-surface-2 text-ink-primary border border-border hover:border-accent',
        danger: 'bg-danger-subtle text-danger',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-base' },
    },
    defaultVariants: { variant: 'accent', size: 'md' },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

Atom específico do domínio visual — **dinheiro sempre em mono tabular** (ver
design system):

```tsx
// ui/atoms/Money.tsx
import { formatMoney } from '@/domain/shared/format'; // regra pura
export function Money({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{formatMoney(value)}</span>;
}
```

### Molecules (`ui/molecules/`)

- **Propósito**: compor 2+ atoms em padrões reutilizáveis. Ainda "burros" — sem
  ciência de feature.
- **Características**: API declarativa (recebem dados e callbacks por props); sem
  hooks de feature; podem ter estado local simples (ex: visibilidade).

Exemplos do projeto: `Modal`, `Toast`, `FormField`.

### Organisms (`ui/organisms/`)

- **Propósito**: componentes **cientes de feature** que conectam UI à lógica.
- **Características**: usam **hooks que chamam use cases** (`useFinalizarPedido`,
  `useSession`...); orquestram formulários; fazem `fold` no `Either` retornado
  para tratar erro/sucesso. **Nunca importam `db` nem repositories direto.**

```tsx
// ui/organisms/PaymentPanel.tsx (esboço)
'use no-op — React 19';
import { useFinalizarPedido } from '@/ui/hooks/useFinalizarPedido';
import { fold } from '@/domain/shared/either';

export function PaymentPanel({ cart, customer }: PaymentPanelProps) {
  const finalizar = useFinalizarPedido();

  async function onConfirm(method: string) {
    const result = await finalizar({ items: cart, customer, method });
    fold(
      result,
      (err) => toast.error(mensagemPara(err)), // erro tipado (AppError) ou "500"
      (order) => toast.success(`Comanda ${order.ticket}`),
    );
  }
  // ...compõe molecules (Modal, MethodGrid) e atoms (Button, Money)
}
```

### Templates (`ui/templates/`)

- **Propósito**: scaffolding de layout (rail de navegação, header, área de
  conteúdo) — só apresentação, sem fetch nem regra.
- **Características**: recebem `children`; usam os tokens de layout
  (`--nav-rail-width`, `--header-height`). Hoje corresponde ao `Layout` atual.

### Pages (`ui/pages/`)

- **Propósito**: composições de página inteira que montam template + organisms.
- **Importante**: não são os arquivos de rota; as rotas em `app/` importam estas
  pages. Mapeiam 1:1 com as rotas atuais (`PdvPage`, `OrdersPage`,
  `CashPage`...).

```tsx
// ui/pages/PdvPage.tsx
import { AppShell } from '@/ui/templates/AppShell';
import { ProductGrid } from '@/ui/organisms/ProductGrid';
import { Cart } from '@/ui/organisms/Cart';
import { PaymentPanel } from '@/ui/organisms/PaymentPanel';

export function PdvPage() {
  return (
    <AppShell>
      <ProductGrid />
      <Cart />
      <PaymentPanel />
    </AppShell>
  );
}
```

```tsx
// app/routes — a rota apenas referencia a page
<Route path="/pdv" element={<PdvPage />} />
```

---

## Styling

- **Tailwind** para tudo; **`cn()`** (`clsx` + `tailwind-merge`) para merge
  seguro de classes; **CVA** para variantes.
- Cores, tipografia, espaço e raio vêm **sempre** dos tokens do
  [`design-system.md`](./design-system.md) (`bg-surface-1`, `text-ink-primary`,
  `bg-accent`, `font-mono tabular-nums`...). **Sem `#hex` nem valores arbitrários
  em componente.**
- Sem CSS inline; sem cor hardcoded.

---

## Migração do código atual

Hoje cada página tem seu `.css` (`PDV.css`, `Panel.css`...) e os componentes
estão soltos em `src/components/`. Mapeamento-alvo:

| Atual                     | Vai para                       | Camada   |
| ------------------------- | ------------------------------ | -------- |
| `components/Modal.tsx`    | `ui/molecules/Modal`           | molecule |
| `components/Toast.tsx`    | `ui/molecules/Toast`           | molecule |
| `components/ContactModal` | `ui/organisms/ContactModal`    | organism |
| `components/Layout.tsx`   | `ui/templates/AppShell`        | template |
| `pages/PDV.tsx`           | `ui/pages/PdvPage` + organisms | page     |
| `pages/*.tsx` (demais)    | `ui/pages/*Page` + organisms   | page     |
| `utils/format.ts`         | `domain/shared/format` (regra) | (domain) |

A migração é incremental: portar uma página por vez, extraindo seus organisms e
movendo a regra de negócio para use cases (ver `architecture.md`). O CSS de cada
página é reescrito em utilitários Tailwind conforme ela é migrada.

---

## Decisão de camada (árvore)

```
É um bloco indivisível, sem feature?            → atom
Compõe atoms, sem ciência de feature?           → molecule
Usa hook/use case, conhece uma feature?         → organism
Define estrutura de layout, só apresentação?    → template
Monta template + organisms numa rota?           → page
```

> Consistência vence novidade: prefira estender um atom/molecule existente a
> criar um novo primitivo.

---

## Testes

| Camada    | Abordagem                                                                                  |
| --------- | ------------------------------------------------------------------------------------------ |
| Atoms     | Testes leves ou cobertos via molecules/organisms.                                          |
| Molecules | Render por props, exibição condicional, encaminhamento de callbacks.                       |
| Organisms | Integração com **hooks/use cases mockados**; estados de loading/erro/sucesso (via `fold`). |
| Templates | Geralmente cobertos por testes de page.                                                    |
| Pages     | Integração compondo template + organisms.                                                  |

Testes usam React Testing Library, consultando por papéis ARIA e labels
(`getByRole`, `getByLabelText`).
