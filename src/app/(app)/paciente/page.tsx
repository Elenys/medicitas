'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, CalendarPlus, History } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAppointmentActions } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import { UI_TEXT } from '@/lib/labels';
import type { AppointmentDto, DashboardResponse } from '@/types/api';

export default function PatientHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { confirm, cancel } = useAppointmentActions();
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
  });
  const dash = data?.role === 'PATIENT' ? data : undefined;

  const handleConfirm = (a: AppointmentDto): void =>
    confirm.mutate(a.id, {
      onSuccess: () => toast.showSuccess(UI_TEXT.confirmSuccess),
      onError: (e) => toast.showError(e.message),
    });
  const handleCancel = (a: AppointmentDto, reason: string): void =>
    cancel.mutate(
      { id: a.id, reason },
      {
        onSuccess: () => {
          setCancelling(null);
          toast.showSuccess(UI_TEXT.cancelSuccess);
        },
        onError: (e) => toast.showError(e.message),
      },
    );

  return (
    <PageContainer
      title={`Hola, ${user.firstName}`}
      actions={
        <Button
          onClick={() => router.push('/paciente/agendar')}
          icon={<CalendarPlus className="h-5 w-5" />}
        >
          Agendar cita
        </Button>
      }
    >
      {isLoading || !dash ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="proxima">
            <h2
              id="proxima"
              className="text-content-muted mb-3 text-sm font-semibold tracking-wide uppercase"
            >
              Próxima cita
            </h2>
            {dash.nextAppointment ? (
              <AppointmentCard
                appointment={dash.nextAppointment}
                viewerRole="PATIENT"
                highlighted
                onConfirm={handleConfirm}
                onCancel={setCancelling}
                detailHref={`/paciente/citas/${dash.nextAppointment.id}`}
              />
            ) : (
              <EmptyState
                title={UI_TEXT.noUpcoming}
                action={
                  <Link
                    href="/paciente/agendar"
                    className="text-primary-dark font-medium hover:underline"
                  >
                    Agendar mi primera cita
                  </Link>
                }
              />
            )}
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard label="Citas próximas" value={dash.upcomingCount} icon={CalendarCheck} />
            <KpiCard
              label="Citas atendidas"
              value={dash.completedCount}
              icon={History}
              tone="success"
            />
          </div>
          <section aria-labelledby="proximas">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="proximas"
                className="text-content-muted text-sm font-semibold tracking-wide uppercase"
              >
                Próximas citas
              </h2>
              <Link
                href="/paciente/citas"
                className="text-primary-dark text-sm font-medium hover:underline"
              >
                Ver todas mis citas
              </Link>
            </div>
            <AppointmentList
              filters={{ scope: 'upcoming', pageSize: 5 }}
              viewerRole="PATIENT"
              emptyTitle={UI_TEXT.noUpcoming}
              detailBase="/paciente/citas"
              onConfirm={handleConfirm}
              onCancel={setCancelling}
            />
          </section>
        </div>
      )}
      <CancelAppointmentDialog
        appointment={cancelling}
        isLoading={cancel.isPending}
        onConfirm={handleCancel}
        onClose={() => setCancelling(null)}
      />
    </PageContainer>
  );
}
