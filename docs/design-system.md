# Design System — "Balcão Digital"

A identidade visual do PDV. Este documento dá **nome e regras** ao que já existe
em [`src/styles/tokens.css`](../src/styles/tokens.css), para que o produto tenha
personalidade consistente e **não** caia no visual genérico de template.

Relacionados: [`atomic-design.md`](./atomic-design.md) (como os componentes
consomem estes tokens) e [`architecture.md`](./architecture.md).

> **Fonte da verdade:** os tokens vivem em `src/styles/tokens.css`. O Tailwind
> apenas os consome via `@theme`. Nenhum valor de cor/espaço/raio deve ser
> escrito direto num componente.

---

## Conceito

Um PDV de lanchonete não deveria parecer um dashboard SaaS azul. A identidade
parte de três **metáforas físicas** do balcão, cada uma com um papel:

| Metáfora               | Superfície            | Papel no produto                         |
| ---------------------- | --------------------- | ---------------------------------------- |
| **Papel de recibo**    | off-white quente      | Chrome do app: navegação, cards, formulários |
| **Quadro-negro / cardápio** | dark `#2C2C2E`   | Exibição: cardápio, painel do cliente, KDS |
| **Etiqueta de preço**  | âmbar `#E8722A`       | Ação e dinheiro: botões, totais, destaques |

O contraste **papel ↔ chalkboard** com toques de **âmbar** é a assinatura. Tom
quente em tudo — nada de cinza frio neutro.

---

## Tokens

### Superfícies (papel de recibo)

| Token             | Valor       | Uso                                  |
| ----------------- | ----------- | ------------------------------------ |
| `--surface-0`     | `#F5F2ED`   | Fundo da aplicação                   |
| `--surface-1`     | `#F8F7F4`   | Cards, painéis                       |
| `--surface-2`     | `#FFFFFF`   | Elementos elevados, inputs           |
| `--surface-inset` | `#EDEAE4`   | Campos rebaixados, trilhos           |

### Cardápio (chalkboard dark)

| Token                | Valor       | Uso                                  |
| -------------------- | ----------- | ------------------------------------ |
| `--cardapio-bg`      | `#2C2C2E`   | Fundo do cardápio / painel cliente   |
| `--cardapio-surface` | `#3A3A3C`   | Cards sobre o chalkboard             |
| `--cardapio-text`    | `#F5F2ED`   | Texto sobre o escuro                 |
| `--cardapio-muted`   | `#A1A1A6`   | Texto secundário sobre o escuro      |

### Ink (warm grays — texto e ícones)

| Token              | Valor       | Uso                          |
| ------------------ | ----------- | ---------------------------- |
| `--ink-primary`    | `#1C1B1A`   | Texto principal              |
| `--ink-secondary`  | `#5C5A56`   | Texto secundário             |
| `--ink-tertiary`   | `#8A8680`   | Legendas, placeholders       |
| `--ink-muted`      | `#B5B1AA`   | Desabilitado, scrollbar      |

### Accent (etiqueta de preço)

| Token              | Valor       | Uso                          |
| ------------------ | ----------- | ---------------------------- |
| `--accent`         | `#E8722A`   | Ação primária, total, preço  |
| `--accent-hover`   | `#D4621F`   | Hover da ação primária       |
| `--accent-subtle`  | `#FDF0E8`   | Fundo suave de destaque      |
| `--accent-text`    | `#FFFFFF`   | Texto sobre o âmbar          |

### Semânticos

`--success #3A8A5C` · `--warning #D4922A` · `--danger #C43E3E` · `--info #3A6B8A`
— cada um com sua variante `-subtle` para fundos.

### Bordas (tinta translúcida — nunca cinza sólido)

`--border` (10%) · `--border-emphasis` (18%) · `--border-strong` (28%) ·
`--border-focus` (âmbar). Todas derivam de `rgba(28, 27, 26, …)`.

### Tipografia

- **`--font-sans`**: Inter — toda a interface.
- **`--font-mono`**: JetBrains Mono — **dinheiro, comandas e quantidades**,
  sempre com `tabular-nums` (classe `.tabular`) para alinhamento vertical dos
  dígitos. É um detalhe de PDV de verdade, não decorativo.
- Escala: `--text-xs 11` → `--text-3xl 30`. Pesos `400`–`800`. Tracking
  `tight / normal / wide`.

### Espaço, raio, movimento

- **Espaço**: base 4px (`--space-1 4px` … `--space-16 64px`).
- **Raio**: "rounded, not bubbly" — `--radius-sm 6` … `--radius-xl 16`,
  `--radius-full` só para pílulas/avatares.
- **Movimento**: `--ease-out` com `--duration-fast 120ms` / `--duration-normal 200ms`.
  Discreto; sem animações chamativas.

### Layout

`--nav-rail-width 72px` · `--nav-bottom-height 64px` · `--header-height 56px`.

---

## Mapeamento para Tailwind (`@theme`)

Os tokens são expostos ao Tailwind via `@theme`, gerando utilitários. Exemplo:

```css
@theme {
  --color-surface-0: #F5F2ED;
  --color-surface-1: #F8F7F4;
  --color-ink-primary: #1C1B1A;
  --color-accent: #E8722A;
  --color-accent-subtle: #FDF0E8;
  --color-cardapio-bg: #2C2C2E;
  /* ...todos os tokens de cor... */

  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;

  --radius-md: 8px;
  --radius-lg: 12px;
  /* ...etc... */
}
```

Gera classes como `bg-surface-1`, `text-ink-primary`, `bg-accent`,
`border-border`, `rounded-lg`, `font-mono`. **Componentes usam estas classes —
nunca `#hex` ou valores arbitrários.**

---

## Do / Don't (anti-genérico)

A regra que separa "Balcão Digital" de "qualquer template de IA".

### Faça

- ✅ Sempre usar tokens nomeados (`bg-surface-1`, `text-accent`).
- ✅ Preço, total, comanda e quantidade em **`font-mono` + `tabular-nums`**.
- ✅ Âmbar (`accent`) **só** para ação e dinheiro.
- ✅ Bordas em **tinta translúcida** (`--border*`), nunca cinza opaco.
- ✅ Usar o **chalkboard** para superfícies de exibição (cardápio, painel do
  cliente, KDS) — é o que dá o contraste de balcão.
- ✅ Cantos "rounded, not bubbly" e movimento discreto.

### Não faça

- ❌ Cinza frio neutro (`#6B7280`, `slate-*`) — quebra o tom quente.
- ❌ Azul como cor primária / o visual padrão "azul shadcn".
- ❌ Sombras azuladas ou drop-shadows pesadas; preferir borda + leve elevação.
- ❌ Hex solto ou `text-[13px]` arbitrário em componente — vá ao token.
- ❌ Âmbar como cor decorativa de fundo de seções inteiras (vira "marca d'água").
- ❌ Gradientes chamativos fora do hero da landing.

> **Teste rápido:** se a tela poderia ser de qualquer SaaS genérico, faltou
> papel-de-recibo, faltou chalkboard, ou o âmbar virou decoração. Volte aos
> tokens e ao conceito.
