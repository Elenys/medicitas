'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextArea } from '@/components/ui/fields';
import { MAX_NOTES_LENGTH } from '@/lib/constants';
import { UI_TEXT } from '@/lib/labels';
import type { AppointmentDto } from '@/types/api';

export interface AttentionFormProps {
  appointment: AppointmentDto;
  isLoading?: boolean;
  onCompleted: (notes: string | undefined) => void;
}

/** Única pantalla donde el médico escribe información clínica (RN-27). */
export function AttentionForm({ appointment, isLoading, onCompleted }: AttentionFormProps) {
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setConfirming(true);
      }}
      className="flex flex-col gap-4"
    >
      <TextArea
        label="Observaciones de la atención"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={MAX_NOTES_LENGTH}
        currentLength={notes.length}
        rows={6}
        hint="Opcional. Quedará visible para el paciente en su historial."
      />
      {!appointment.canComplete && (
        <p className="text-content-muted text-sm">{UI_TEXT.notStartedYet}</p>
      )}
      <Button
        type="submit"
        disabled={!appointment.canComplete}
        isLoading={isLoading}
        className="self-start"
      >
        Marcar como completada
      </Button>
      <ConfirmDialog
        isOpen={confirming}
        title="Registrar la atención"
        message="La cita pasará a Completada y se moverá al historial del paciente. Esta acción no se puede deshacer."
        confirmLabel="Marcar como completada"
        isLoading={isLoading}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onCompleted(notes.trim() || undefined);
        }}
      />
    </form>
  );
}
