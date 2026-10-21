import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'primary' | 'success' | 'danger' | 'neutral';
}) {
  const tones = {
    primary: 'bg-primary-light text-primary-dark',
    success: 'bg-success-light text-success-dark',
    danger: 'bg-danger-light text-danger-darker',
    neutral: 'bg-background text-content',
  };
  return (
    <div className="rounded-card border-border bg-surface shadow-card flex items-center gap-4 border p-4">
      <span
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
          tones[tone],
        )}
      >
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl leading-tight font-bold">{value}</p>
        <p className="text-content-muted text-sm">{label}</p>
      </div>
    </div>
  );
}
