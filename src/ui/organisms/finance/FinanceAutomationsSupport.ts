import type {
  FinanceCategory,
  FinanceKind,
  MonthKey,
} from '../../../domain/finance/finance.entity';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
});

export function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

export interface CategoryOption {
  value: string;
  label: string;
}

export function categoryOptions(
  categories: FinanceCategory[],
  kind: FinanceKind,
  currentUid: string,
): CategoryOption[] {
  const options = categories
    .filter((category) => category.kind === kind)
    .map((category) => ({ value: category.uid, label: category.name }));
  if (currentUid !== '' && !options.some((o) => o.value === currentUid)) {
    options.push({ value: currentUid, label: 'Categoria arquivada' });
  }
  return options;
}

export const KIND_OPTIONS: { value: FinanceKind; label: string }[] = [
  { value: 'income', label: 'Entrada' },
  { value: 'expense', label: 'Saída' },
];
