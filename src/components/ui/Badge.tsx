import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'primary' | 'success' | 'neutral' | 'danger' | 'warning';

const VARIANTS: Record<BadgeVariant, string> = {
  primary: 'bg-primary-light text-primary-dark border-primary',
  success: 'bg-success-light text-success-dark border-success',
  neutral: 'bg-background text-neutral-badge border-neutral-border',
  danger: 'bg-danger-light text-danger-darker border-danger',
  warning: 'bg-warning-light text-warning-dark border-warning',
};

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
