'use client';

import { PageSpinner } from '@/components/ui/Spinner';
import { useSpecialties } from '@/hooks/useAvailability';
import { cn } from '@/lib/utils';

export function SpecialtySelector({
  value,
  onChange,
}: {
  value?: number;
  onChange: (id: number) => void;
}) {
  const { data, isLoading } = useSpecialties();
  if (isLoading || !data) return <PageSpinner />;
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">Especialidad</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            aria-pressed={value === s.id}
            className={cn(
              'rounded-card min-h-12 border p-4 text-left transition-colors',
              value === s.id
                ? 'border-primary-dark bg-primary-light'
                : 'border-border bg-surface hover:border-primary',
            )}
          >
            <p className="font-semibold">{s.name}</p>
            {s.description && <p className="text-content-muted text-sm">{s.description}</p>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
