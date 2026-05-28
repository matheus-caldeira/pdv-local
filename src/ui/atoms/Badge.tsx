import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const badge = cva('inline-flex items-center gap-1 rounded-full font-semibold', {
  variants: {
    tone: {
      success: 'bg-success-subtle text-success',
      warning: 'bg-warning-subtle text-warning',
      danger: 'bg-danger-subtle text-danger',
      info: 'bg-info-subtle text-info',
      accent: 'bg-accent-subtle text-accent',
      muted: 'bg-surface-inset text-ink-tertiary',
    },
    size: {
      xs: 'px-1.5 py-px text-xs',
      sm: 'px-2 py-0.5 text-xs',
    },
    uppercase: {
      true: 'uppercase tracking-wide',
      false: '',
    },
  },
  defaultVariants: {
    tone: 'muted',
    size: 'sm',
    uppercase: false,
  },
});

type BadgeProps = VariantProps<typeof badge> & {
  className?: string;
  children: ReactNode;
};

export function Badge({
  tone,
  size,
  uppercase,
  className,
  children,
}: BadgeProps) {
  return (
    <span className={cn(badge({ tone, size, uppercase }), className)}>
      {children}
    </span>
  );
}
