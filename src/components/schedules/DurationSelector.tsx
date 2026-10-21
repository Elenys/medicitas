'use client';

import { SelectField } from '@/components/ui/fields';
import {
  MAX_APPOINTMENT_DURATION_MINUTES,
  MIN_APPOINTMENT_DURATION_MINUTES,
} from '@/lib/constants';

const STEP = 5;
const OPTIONS = Array.from(
  { length: (MAX_APPOINTMENT_DURATION_MINUTES - MIN_APPOINTMENT_DURATION_MINUTES) / STEP + 1 },
  (_, i) => {
    const value = MIN_APPOINTMENT_DURATION_MINUTES + i * STEP;
    return { value, label: `${value} minutos` };
  },
);

export function DurationSelector({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  return (
    <SelectField
      label="Duración de cada consulta"
      options={OPTIONS}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      hint="Cambiarla no altera las citas ya agendadas; solo los cupos futuros."
      containerClassName="max-w-xs"
    />
  );
}
