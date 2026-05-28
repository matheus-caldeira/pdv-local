import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';

type SearchFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchField({ className, ...props }: SearchFieldProps) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="text"
        className={cn(
          'min-h-[44px] w-full rounded-md border border-border-emphasis bg-surface-inset py-3 pl-10 pr-3 text-sm text-ink-primary outline-none focus:border-accent',
          className,
        )}
        {...props}
      />
    </div>
  );
}
