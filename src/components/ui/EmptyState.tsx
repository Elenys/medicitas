import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border-border flex flex-col items-center gap-3 border border-dashed px-6 py-12 text-center">
      <Icon aria-hidden="true" className="text-content-disabled h-10 w-10" />
      <p className="font-semibold">{title}</p>
      {message && <p className="text-content-muted max-w-md text-sm">{message}</p>}
      {action}
    </div>
  );
}
