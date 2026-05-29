import type { ReactNode } from 'react';

interface SummaryCard {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}

interface SalesSummaryCardsProps {
  cards: SummaryCard[];
}

export function SalesSummaryCards({ cards }: SalesSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={
            card.highlight
              ? 'flex flex-col gap-1 rounded-md border border-border-emphasis bg-surface-inset px-4 py-3'
              : 'flex flex-col gap-1 rounded-md border border-border bg-surface-2 px-4 py-3'
          }
        >
          <span className="text-lg font-extrabold text-ink-primary">
            {card.value}
          </span>
          <span className="text-xs font-semibold text-ink-tertiary">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
}
