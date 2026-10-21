import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'info' | 'success' | 'warning' | 'error';

const STYLES: Record<Variant, { box: string; Icon: typeof Info }> = {
  info: { box: 'border-primary bg-primary-light text-primary-darker', Icon: Info },
  success: { box: 'border-success bg-success-light text-success-dark', Icon: CheckCircle2 },
  warning: { box: 'border-warning bg-warning-light text-warning-dark', Icon: AlertTriangle },
  error: { box: 'border-danger bg-danger-light text-danger-darker', Icon: AlertCircle },
};

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  action,
}: {
  variant?: Variant;
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  const { box, Icon } = STYLES[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border border-l-4 px-4 py-3 text-sm', box, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
