'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/fields';
import { MAX_REASON_LENGTH, MIN_CANCELLATION_REASON_LENGTH } from '@/lib/constants';
import { formatDateTime } from '@/lib/datetime';
import type { AppointmentDto } from '@/types/api';

export interface CancelAppointmentDialogProps {
  appointment: AppointmentDto | null;
  isLoading?: boolean;
  onConfirm: (appointment: AppointmentDto, reason: string) => void;
  onClose: () => void;
}

/** El motivo es obligatorio (RN-24.1). */
export function CancelAppointmentDialog({
  appointment,
  isLoading,
  onConfirm,
  onClose,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const tooShort = reason.trim().length < MIN_CANCELLATION_REASON_LENGTH;
  const close = (): void => {
    setReason('');
    setTouched(false);
    onClose();
  };

  return (
    <Modal isOpen={appointment !== null} onClose={close} title="Cancelar cita">
      {appointment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!tooShort) onConfirm(appointment, reason.trim());
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-content-muted">
            Va a cancelar la cita del <strong>{formatDateTime(appointment.startsAt)}</strong>. El
            cupo quedará disponible para otra persona.
          </p>
          <TextArea
            label="Motivo de la cancelación"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            maxLength={MAX_REASON_LENGTH}
            currentLength={reason.length}
            error={touched && tooShort ? 'Indique el motivo de la cancelación' : undefined}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={close} disabled={isLoading}>
              Volver
            </Button>
            <Button type="submit" variant="danger" isLoading={isLoading}>
              Cancelar cita
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
