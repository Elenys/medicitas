'use client';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAvailableSlots } from '@/hooks/useAvailability';
import { formatTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { SlotDto } from '@/types/api';

/** Todas las franjas de la jornada; las ocupadas tachadas y no pulsables. */
export function TimeSlotPicker({
  doctorId,
  date,
  value,
  onChange,
}: {
  doctorId: number;
  date: string;
  value?: SlotDto;
  onChange: (slot: SlotDto) => void;
}) {
  const { data, isLoading } = useAvailableSlots(doctorId, date);
  if (isLoading || !data) return <PageSpinner />;
  if (data.slots.length === 0)
    return (
      <EmptyState
        title="Sin cupos ese día"
        message="Este médico no tiene cupos disponibles el día seleccionado."
      />
    );
  return (
    <fieldset>
      <legend className="mb-3 font-semibold">
        Hora{' '}
        <span className="text-content-muted font-normal">
          (consulta de {data.durationMinutes} min)
        </span>
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {data.slots.map((slot) => {
          const selected = value?.startsAt === slot.startsAt;
          return (
            <button
              key={slot.startsAt}
              type="button"
              disabled={!slot.available}
              aria-disabled={!slot.available}
              aria-pressed={selected}
              onClick={() => onChange(slot)}
              className={cn(
                'min-h-12 rounded-lg border text-sm font-medium transition-colors',
                selected
                  ? 'border-primary-dark bg-primary-dark text-white'
                  : slot.available
                    ? 'border-border bg-surface hover:border-primary hover:bg-primary-light'
                    : 'border-border bg-background text-content-disabled line-through',
              )}
            >
              {formatTime(slot.startsAt)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
