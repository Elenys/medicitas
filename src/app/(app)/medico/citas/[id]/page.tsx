'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { AttentionForm } from '@/components/appointments/AttentionForm';
import { StatusBadge } from '@/components/appointments/StatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppointment, useAppointmentActions } from '@/hooks/useAppointments';
import { formatDate, formatShortDate, formatTimeRange } from '@/lib/datetime';
import { GENDER_LABELS, UI_TEXT } from '@/lib/labels';

const MS_PER_YEAR = 31_557_600_000;
const age = (birthDate?: string): string =>
  birthDate
    ? `${Math.floor((Date.now() - new Date(birthDate).getTime()) / MS_PER_YEAR)} años`
    : '—';

export default function DoctorAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: a, isLoading, isError } = useAppointment(Number(id));
  const { complete } = useAppointmentActions();

  if (isLoading) return <PageSpinner />;
  if (isError || !a)
    return (
      <PageContainer title="Cita">
        <Alert variant="error">No fue posible cargar la cita.</Alert>
      </PageContainer>
    );
  const p = a.patient;

  return (
    <PageContainer
      title="Atención de la cita"
      actions={
        <Button variant="ghost" onClick={() => router.back()}>
          Volver
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card title="Paciente">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-content-muted">Nombre</dt>
                <dd className="font-medium">{p.fullName}</dd>
              </div>
              <div>
                <dt className="text-content-muted">Documento</dt>
                <dd>
                  {p.documentType} {p.documentNumber}
                </dd>
              </div>
              <div>
                <dt className="text-content-muted">Edad</dt>
                <dd>
                  {age(p.birthDate)}
                  {p.birthDate && (
                    <span className="text-content-muted">
                      {' '}
                      ({formatShortDate(`${p.birthDate}T12:00:00`)})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-content-muted">Género</dt>
                <dd>{p.gender ? GENDER_LABELS[p.gender as keyof typeof GENDER_LABELS] : '—'}</dd>
              </div>
              <div>
                <dt className="text-content-muted">Teléfono</dt>
                <dd>{p.phone ?? '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Citas anteriores con usted">
            <AppointmentList
              filters={{ patientId: p.id, scope: 'history', pageSize: 5 }}
              viewerRole="DOCTOR"
              emptyTitle="Sin citas anteriores"
            />
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card title="Cita" actions={<StatusBadge status={a.status} />}>
            <p className="font-medium">{formatDate(a.startsAt)}</p>
            <p className="text-content-muted">{formatTimeRange(a.startsAt, a.endsAt)}</p>
            <p className="mt-3">
              <span className="text-content-muted">Motivo de consulta:</span>{' '}
              {a.reason ?? 'No indicado'}
            </p>
            {a.status === 'CANCELLED' && (
              <p className="text-danger-darker mt-2 text-sm">Cancelada: {a.cancellationReason}</p>
            )}
          </Card>
          {a.status === 'COMPLETED' ? (
            <Card title="Observaciones registradas">
              <p className="whitespace-pre-line">{a.notes || 'Sin observaciones.'}</p>
            </Card>
          ) : a.status === 'CANCELLED' ? null : (
            <Card title="Registro de atención">
              <AttentionForm
                appointment={a}
                isLoading={complete.isPending}
                onCompleted={(notes) =>
                  complete.mutate(
                    { id: a.id, notes },
                    {
                      onSuccess: () => {
                        toast.showSuccess(UI_TEXT.completeSuccess);
                        router.push('/medico');
                      },
                      onError: (e) => toast.showError(e.message),
                    },
                  )
                }
              />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
