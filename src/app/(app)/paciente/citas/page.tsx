'use client';

import { useState } from 'react';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useAppointmentActions } from '@/hooks/useAppointments';
import { UI_TEXT } from '@/lib/labels';
import type { AppointmentDto } from '@/types/api';

export default function PatientAppointmentsPage() {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);
  const toast = useToast();
  const { confirm, cancel } = useAppointmentActions();
  return (
    <PageContainer title="Mis citas">
      <Tabs
        tabs={[
          { key: 'upcoming', label: 'Próximas' },
          { key: 'history', label: 'Historial' },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as 'upcoming' | 'history')}
      />
      <div className="mt-4">
        <AppointmentList
          key={tab}
          filters={{ scope: tab }}
          viewerRole="PATIENT"
          emptyTitle={tab === 'upcoming' ? UI_TEXT.noUpcoming : 'No tiene citas en su historial.'}
          detailBase="/paciente/citas"
          onConfirm={(a) =>
            confirm.mutate(a.id, {
              onSuccess: () => toast.showSuccess(UI_TEXT.confirmSuccess),
              onError: (e) => toast.showError(e.message),
            })
          }
          onCancel={setCancelling}
        />
      </div>
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
