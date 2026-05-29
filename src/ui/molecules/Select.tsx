import type { SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'min-h-[44px] w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-base text-ink-primary outline-none focus:border-accent',
        className,
      )}
      {...props}
    />
  );
}
