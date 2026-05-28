import { formatMoney } from '../../domain/shared/format';
import { cn } from '../lib/cn';

interface MoneyProps {
  value: number;
  className?: string;
}

export function Money({ value, className }: MoneyProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatMoney(value)}
    </span>
  );
}
