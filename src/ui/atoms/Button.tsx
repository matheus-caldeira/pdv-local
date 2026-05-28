import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
  {
    variants: {
      variant: {
        accent: 'bg-accent text-accent-text hover:bg-accent-hover',
        ghost:
          'bg-surface-2 text-ink-secondary border border-border-emphasis hover:bg-surface-inset',
        danger: 'bg-danger text-accent-text hover:opacity-90',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'accent',
      size: 'md',
      fullWidth: false,
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(button({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
