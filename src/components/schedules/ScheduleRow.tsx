'use client';

import { Trash2 } from 'lucide-react';
import { InputField } from '@/components/ui/fields';
import type { ScheduleDto } from '@/types/api';

export function ScheduleRow({
  schedule,
  index,
  error,
  onChange,
  onRemove,
}: {
  schedule: ScheduleDto;
  index: number;
  error?: string;
  onChange: (next: ScheduleDto) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <InputField
        label={`Inicio franja ${index + 1}`}
        type="time"
        step={300}
        value={schedule.startTime}
        onChange={(e) => onChange({ ...schedule, startTime: e.target.value })}
        containerClassName="w-36"
      />
      <InputField
        label={`Fin franja ${index + 1}`}
        type="time"
        step={300}
        value={schedule.endTime}
        onChange={(e) => onChange({ ...schedule, endTime: e.target.value })}
        error={error}
        containerClassName="w-36"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Eliminar franja ${index + 1}`}
        className="text-danger-dark hover:bg-danger-light flex h-12 w-12 items-center justify-center rounded-lg"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}
