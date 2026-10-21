'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAppointmentActions } from '@/hooks/useAppointments';
import { api } from '@/lib/api-client';
import { addClinicDays, formatWeekdayDate, toClinicDateString } from '@/lib/datetime';
import { UI_TEXT } from '@/lib/labels';
import type { AppointmentDto, DashboardResponse } from '@/types/api';

export default function DoctorAgendaPage() {
  const router = useRouter();
  const toast = useToast();
  const today = toClinicDateString(new Date());
  const [date, setDate] = useState(today);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);
  const { cancel } = useAppointmentActions();
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
  });
  const dash = data?.role === 'DOCTOR' ? data : undefined;

  return (
    <PageContainer title="Mi agenda">
      {dash && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <KpiCard label="Citas de hoy" value={dash.todayCount} icon={CalendarClock} />
          <KpiCard
            label="Pendientes de confirmar"
            value={dash.pendingConfirmationCount}
            icon={CalendarCheck}
            tone="neutral"
          />
          <KpiCard
            label="Atendidas hoy"
            value={dash.completedTodayCount}
            icon={ClipboardCheck}
            tone="success"
          />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-label="Día anterior"
          onClick={() => setDate(addClinicDays(date, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setDate(today)}>
          Hoy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Día siguiente"
          onClick={() => setDate(addClinicDays(date, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="ml-2 text-lg font-semibold capitalize" aria-live="polite">
          {formatWeekdayDate(`${date}T12:00:00`)}
        </h2>
        <label className="ml-auto flex min-h-12 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
            className="accent-primary-dark h-5 w-5"
          />
          Mostrar canceladas
        </label>
      </div>
      <AppointmentList
        key={`${date}-${includeCancelled}`}
        filters={{ date, includeCancelled }}
        viewerRole="DOCTOR"
        emptyTitle={UI_TEXT.noAppointmentsToday}
        detailBase="/medico/citas"
        onComplete={(a) => router.push(`/medico/citas/${a.id}`)}
        onCancel={setCancelling}
      />
      <CancelAppointmentDialog
        appointment={cancelling}
        isLoading={cancel.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={(a, reason) =>
          cancel.mutate(
            { id: a.id, reason },
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
