import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ className, ...props }: TextFieldProps) {
  return (
    <input
      className={cn(
        'min-h-[38px] w-full rounded-sm border border-border-emphasis bg-surface-inset px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent',
        className,
      )}
      {...props}
    />
  );
}
