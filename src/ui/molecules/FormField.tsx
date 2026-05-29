import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface FormFieldProps {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-secondary">
          {label}
        </span>
        {children}
      </label>
      {hint && <span className="text-xs text-ink-tertiary">{hint}</span>}
    </div>
  );
}
