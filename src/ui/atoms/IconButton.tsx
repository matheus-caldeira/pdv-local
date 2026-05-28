import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const iconButton = cva(
  'inline-flex items-center justify-center rounded-md border border-border-emphasis bg-surface-2 transition-colors hover:bg-surface-inset cursor-pointer',
  {
    variants: {
      tone: {
        default: 'text-ink-secondary',
        danger: 'text-danger',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
      },
    },
    defaultVariants: {
      tone: 'default',
      size: 'sm',
    },
  },
);

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButton>;

export function IconButton({
  tone,
  size,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(iconButton({ tone, size }), className)}
      {...props}
    />
  );
}
