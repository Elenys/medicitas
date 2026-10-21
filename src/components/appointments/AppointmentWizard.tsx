'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAppointmentActions } from '@/hooks/useAppointments';
import { ApiError } from '@/lib/api-client';
import { UI_TEXT } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AppointmentDto, DoctorSummary, SlotDto } from '@/types/api';
import { AppointmentSummary } from './AppointmentSummary';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { DoctorList } from './DoctorList';
import { SpecialtySelector } from './SpecialtySelector';
import { TimeSlotPicker } from './TimeSlotPicker';

const STEPS = ['Especialidad y médico', 'Fecha y hora', 'Confirmación'];

/** Conflictos de agenda: no son un error del formulario, se vuelve a elegir la hora. */
const SLOT_CONFLICT_CODES = ['SLOT_TAKEN', 'PATIENT_APPOINTMENT_TOO_CLOSE'];

/** El estado del asistente vive aquí, no en los pasos: Atrás no pierde nada (05 §5.4). */
export function AppointmentWizard({
  onCompleted,
}: {
  onCompleted: (appointment: AppointmentDto) => void;
}) {
  const [step, setStep] = useState(0);
  const [specialtyId, setSpecialtyId] = useState<number>();
  const [doctor, setDoctor] = useState<DoctorSummary>();
  const [date, setDate] = useState<string>();
  const [slot, setSlot] = useState<SlotDto>();
  const [reason, setReason] = useState('');
  const [slotIssue, setSlotIssue] = useState<string>();
  const { book } = useAppointmentActions();
  const toast = useToast();

  const canAdvance = step === 0 ? doctor !== undefined : step === 1 ? slot !== undefined : false;

  const submit = (): void => {
    if (!doctor || !slot) return;
    book.mutate(
      { doctorId: doctor.id, startsAt: slot.startsAt, reason: reason || undefined },
      {
        onSuccess: (created) => {
          toast.showSuccess(UI_TEXT.bookingSuccess);
          onCompleted(created);
        },
        onError: (error) => {
          if (error instanceof ApiError && SLOT_CONFLICT_CODES.includes(error.code)) {
            setSlotIssue(error.message);
            setSlot(undefined);
            setStep(1);
            return;
          }
          toast.showError(error.message);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex gap-2" aria-label="Progreso">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'flex flex-1 items-center gap-2 border-b-4 pb-2 text-sm',
              i <= step
                ? 'border-primary-dark text-primary-dark'
                : 'border-border text-content-muted',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                i <= step ? 'bg-primary-dark text-white' : 'bg-border',
              )}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>

      {slotIssue && <Alert variant="warning">{slotIssue}</Alert>}

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <SpecialtySelector
            value={specialtyId}
            onChange={(id) => {
              setSpecialtyId(id);
              setDoctor(undefined);
              setDate(undefined);
              setSlot(undefined);
            }}
          />
          {specialtyId !== undefined && (
            <DoctorList
              specialtyId={specialtyId}
              value={doctor}
              onChange={(d) => {
                setDoctor(d);
                setDate(undefined);
                setSlot(undefined);
              }}
            />
          )}
        </div>
      )}
      {step === 1 && doctor && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AvailabilityCalendar
            doctorId={doctor.id}
            value={date}
            onChange={(d) => {
              setDate(d);
              setSlot(undefined);
              setSlotIssue(undefined);
            }}
          />
          {date ? (
            <TimeSlotPicker
              doctorId={doctor.id}
              date={date}
              value={slot}
              onChange={(s) => {
                setSlot(s);
                setSlotIssue(undefined);
              }}
            />
          ) : (
            <p className="text-content-muted">Seleccione un día con cupo en el calendario.</p>
          )}
        </div>
      )}
      {step === 2 && doctor && slot && (
        <AppointmentSummary
          doctor={doctor}
          slot={slot}
          reason={reason}
          onReasonChange={setReason}
          onConfirm={submit}
          isSubmitting={book.isPending}
        />
      )}

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || book.isPending}
        >
          Atrás
        </Button>
        {step < 2 && (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
}
