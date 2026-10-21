import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  title?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function Card({ title, actions, footer, children, className, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card border-border bg-surface shadow-card border p-4 md:p-6',
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-xl font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
      {footer && <div className="border-border mt-4 border-t pt-4">{footer}</div>}
    </Tag>
  );
}
