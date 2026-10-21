'use client';

import { Stethoscope } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDoctors } from '@/hooks/useAvailability';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { DoctorSummary } from '@/types/api';

export function DoctorList({
  specialtyId,
  value,
  onChange,
}: {
  specialtyId: number;
  value?: DoctorSummary;
  onChange: (doctor: DoctorSummary) => void;
}) {
  const { data, isLoading } = useDoctors(specialtyId);
  if (isLoading || !data) return <PageSpinner />;
  if (data.items.length === 0)
    return (
      <EmptyState
        icon={Stethoscope}
        title="No hay médicos disponibles"
        message="No hay médicos con horarios configurados en esta especialidad. Intente otra especialidad."
      />
    );
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">Médico</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.items.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d)}
            aria-pressed={value?.id === d.id}
            className={cn(
              'rounded-card min-h-12 border p-4 text-left transition-colors',
              value?.id === d.id
                ? 'border-primary-dark bg-primary-light'
                : 'border-border bg-surface hover:border-primary',
            )}
          >
            <p className="font-semibold">Dr(a). {d.fullName}</p>
            <p className="text-content-muted text-sm">
              Consulta de {d.appointmentDurationMinutes} minutos
            </p>
            <p className="mt-1 text-sm">
              {d.nextAvailableDate ? (
                <>
                  Primer cupo:{' '}
                  <span className="text-success-dark font-medium">
                    {formatDate(`${d.nextAvailableDate}T12:00:00`)}
                  </span>
                </>
              ) : (
                <span className="text-content-muted">Sin cupos en los próximos 60 días</span>
              )}
            </p>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
