import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import { addMonths } from '../../domain/finance/finance.rules';
import type { MonthKey } from '../../domain/finance/finance.entity';

interface MonthPickerProps {
  value: MonthKey;
  onChange(m: MonthKey): void;
}

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div
      role="group"
      aria-label="Seleção de mês"
      className="flex items-center gap-2"
    >
      <IconButton
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(value, -1))}
      >
        <ChevronLeft size={16} strokeWidth={2} />
      </IconButton>
      <span className="min-w-36 text-center text-sm font-semibold text-ink-primary">
        {monthLabel(value)}
      </span>
      <IconButton
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRight size={16} strokeWidth={2} />
      </IconButton>
    </div>
  );
}
