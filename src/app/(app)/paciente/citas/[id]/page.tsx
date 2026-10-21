'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppointment, useAppointmentActions } from '@/hooks/useAppointments';
import { formatDateTime } from '@/lib/datetime';
import { UI_TEXT } from '@/lib/labels';
import type { AppointmentDto } from '@/types/api';

export default function PatientAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: a, isLoading, isError } = useAppointment(Number(id));
  const { confirm, cancel } = useAppointmentActions();
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);

  if (isLoading) return <PageSpinner />;
  if (isError || !a)
    return (
      <PageContainer title="Cita">
        <Alert variant="error">No fue posible cargar la cita.</Alert>
      </PageContainer>
    );

  return (
    <PageContainer
      title="Detalle de la cita"
      actions={
        <Button variant="ghost" onClick={() => router.back()}>
          Volver
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <AppointmentCard
          appointment={a}
          viewerRole="PATIENT"
          onConfirm={(x) =>
            confirm.mutate(x.id, {
              onSuccess: () => toast.showSuccess(UI_TEXT.confirmSuccess),
              onError: (e) => toast.showError(e.message),
            })
          }
          onCancel={setCancelling}
        />
        {a.status === 'CANCELLED' && (
          <Card title="Cancelación">
            <p>
              <span className="text-content-muted">Motivo:</span> {a.cancellationReason}
            </p>
            {a.cancelledBy && (
              <p className="text-content-muted mt-1 text-sm">
                Cancelada por {a.cancelledBy.fullName}
              </p>
            )}
          </Card>
        )}
        {a.status === 'COMPLETED' && (
          <Card title="Observaciones del médico">
            <p className="whitespace-pre-line">
              {a.notes || 'El médico no registró observaciones.'}
            </p>
          </Card>
        )}
        <p className="text-content-muted text-xs">Reservada el {formatDateTime(a.createdAt)}</p>
      </div>
      <CancelAppointmentDialog
        appointment={cancelling}
        isLoading={cancel.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={(x, reason) =>
          cancel.mutate(
            { id: x.id, reason },
            {
              onSuccess: () => {
                setCancelling(null);
                toast.showSuccess(UI_TEXT.cancelSuccess);
              },
              onError: (e) => toast.showError(e.message),
            },
          )
        }
      />
    </PageContainer>
  );
}
