'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WEEKDAYS } from '@/lib/constants';
import type { ScheduleDto } from '@/types/api';
import { ScheduleRow } from './ScheduleRow';

const DEFAULT_START = '08:00';
const DEFAULT_END = '12:00';

/** Rejilla de 7 días con sus franjas; genera los cupos que consumirá el calendario. */
export function ScheduleEditor({
  schedules,
  errors,
  onChange,
}: {
  schedules: ScheduleDto[];
  errors: Record<number, string>;
  onChange: (next: ScheduleDto[]) => void;
}) {
  const update = (index: number, next: ScheduleDto | null): void => {
    const copy = [...schedules];
    if (next === null) copy.splice(index, 1);
    else copy[index] = next;
    onChange(copy);
  };
  return (
    <div className="divide-border flex flex-col divide-y">
      {WEEKDAYS.map((day) => {
        const entries = schedules
          .map((s, index) => ({ s, index }))
          .filter(({ s }) => s.weekday === day.value);
        return (
          <section key={day.value} className="grid gap-3 py-4 md:grid-cols-[8rem_1fr]">
            <h3 className="font-semibold">{day.label}</h3>
            <div className="flex flex-col gap-3">
              {entries.length === 0 && <p className="text-content-muted text-sm">No atiende</p>}
              {entries.map(({ s, index }, position) => (
                <ScheduleRow
                  key={index}
                  schedule={s}
                  index={position}
                  error={errors[index]}
                  onChange={(next) => update(index, next)}
                  onRemove={() => update(index, null)}
                />
              ))}
              <Button
                variant="secondary"
                size="sm"
                className="self-start"
                icon={<Plus className="h-4 w-4" />}
                onClick={() =>
                  onChange([
                    ...schedules,
                    { weekday: day.value, startTime: DEFAULT_START, endTime: DEFAULT_END },
                  ])
                }
              >
                Agregar franja
              </Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
