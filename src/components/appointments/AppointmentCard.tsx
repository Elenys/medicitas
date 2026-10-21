'use client';

import { CalendarDays, Clock, Stethoscope, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UI_TEXT } from '@/lib/labels';
import { formatTimeRange, formatWeekdayDate } from '@/lib/datetime';
import type { UserRole } from '@/lib/appointment-rules';
import { cn } from '@/lib/utils';
import type { AppointmentDto } from '@/types/api';
import { StatusBadge } from './StatusBadge';

export interface AppointmentCardProps {
  appointment: AppointmentDto;
  viewerRole: UserRole;
  onConfirm?: (appointment: AppointmentDto) => void;
  onCancel?: (appointment: AppointmentDto) => void;
  onComplete?: (appointment: AppointmentDto) => void;
  showActions?: boolean;
  highlighted?: boolean;
  detailHref?: string;
}

/** No llama a la API: avisa al padre y este decide (05 §3.3). */
export function AppointmentCard({
  appointment: a,
  viewerRole,
  onConfirm,
  onCancel,
  onComplete,
  showActions = true,
  highlighted = false,
  detailHref,
}: AppointmentCardProps) {
  const counterpart = viewerRole === 'PATIENT' ? `Dr(a). ${a.doctor.fullName}` : a.patient.fullName;
  const CounterIcon = viewerRole === 'PATIENT' ? Stethoscope : User;
  const isActive = a.status === 'BOOKED' || a.status === 'CONFIRMED';
  const cancelBlocked = showActions && isActive && !a.canCancel && viewerRole === 'PATIENT';
  const completeBlocked = showActions && isActive && !a.canComplete && viewerRole === 'DOCTOR';

  return (
    <article
      className={cn(
        'rounded-card bg-surface shadow-card border p-4',
        highlighted ? 'border-primary' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 font-semibold">
            <CounterIcon aria-hidden="true" className="text-primary-dark h-4 w-4" />
            {counterpart}
          </p>
          <p className="text-content-muted text-sm">{a.doctor.specialty}</p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="text-content-muted h-4 w-4" />
          <dt className="sr-only">Fecha</dt>
          <dd className="capitalize">{formatWeekdayDate(a.startsAt)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Clock aria-hidden="true" className="text-content-muted h-4 w-4" />
          <dt className="sr-only">Hora</dt>
          <dd>{formatTimeRange(a.startsAt, a.endsAt)}</dd>
        </div>
      </dl>
      {a.reason && <p className="text-content-muted mt-2 text-sm">Motivo: {a.reason}</p>}
      {cancelBlocked && (
        <p className="text-warning-dark mt-2 text-xs">{UI_TEXT.cancellationClosed}</p>
      )}
      {completeBlocked && (
        <p className="text-content-muted mt-2 text-xs">{UI_TEXT.notStartedYet}</p>
      )}
      {(showActions || detailHref) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {showActions && a.canConfirm && onConfirm && (
            <Button size="sm" onClick={() => onConfirm(a)}>
              Confirmar
            </Button>
          )}
          {showActions && a.canComplete && onComplete && (
            <Button size="sm" onClick={() => onComplete(a)}>
              Atender
            </Button>
          )}
          {showActions && isActive && onCancel && (
            <Button size="sm" variant="danger" disabled={!a.canCancel} onClick={() => onCancel(a)}>
              Cancelar
            </Button>
          )}
          {detailHref && (
            <Link
              href={detailHref}
              className="text-primary-dark hover:bg-primary-light inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium"
            >
              Ver detalle
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
