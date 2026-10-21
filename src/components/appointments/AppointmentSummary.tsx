'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextArea } from '@/components/ui/fields';
import { MAX_REASON_LENGTH } from '@/lib/constants';
import { formatDate, formatTimeRange } from '@/lib/datetime';
import type { DoctorSummary, SlotDto } from '@/types/api';

export interface AppointmentSummaryProps {
  doctor: DoctorSummary;
  slot: SlotDto;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function AppointmentSummary({
  doctor,
  slot,
  reason,
  onReasonChange,
  onConfirm,
  isSubmitting,
}: AppointmentSummaryProps) {
  return (
    <Card title="Resumen de la cita">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-content-muted text-sm">Médico</dt>
          <dd className="font-medium">Dr(a). {doctor.fullName}</dd>
        </div>
        <div>
          <dt className="text-content-muted text-sm">Especialidad</dt>
          <dd className="font-medium">{doctor.specialty.name}</dd>
        </div>
        <div>
          <dt className="text-content-muted text-sm">Fecha</dt>
          <dd className="font-medium">{formatDate(slot.startsAt)}</dd>
        </div>
        <div>
          <dt className="text-content-muted text-sm">Hora</dt>
          <dd className="font-medium">
            {formatTimeRange(slot.startsAt, slot.endsAt)} ({doctor.appointmentDurationMinutes} min)
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        <TextArea
          label="Motivo de la consulta"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          maxLength={MAX_REASON_LENGTH}
          currentLength={reason.length}
          hint="Opcional"
          rows={3}
        />
      </div>
      <Button className="mt-4 w-full sm:w-auto" onClick={onConfirm} isLoading={isSubmitting}>
        Confirmar cita
      </Button>
    </Card>
  );
}
