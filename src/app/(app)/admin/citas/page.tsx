'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CancelAppointmentDialog } from '@/components/appointments/CancelAppointmentDialog';
import { StatusBadge } from '@/components/appointments/StatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateField, SelectField } from '@/components/ui/fields';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAppointmentActions, useAppointments } from '@/hooks/useAppointments';
import { api } from '@/lib/api-client';
import { addClinicDays, formatDateTime, toClinicDateString } from '@/lib/datetime';
import { STATUS_LABELS, UI_TEXT } from '@/lib/labels';
import type { AppointmentDto, Paginated, UserDto } from '@/types/api';

export default function AdminAppointmentsPage() {
  const toast = useToast();
  const today = toClinicDateString(new Date());
  const [from, setFrom] = useState(addClinicDays(today, -7));
  const [to, setTo] = useState(addClinicDays(today, 14));
  const [status, setStatus] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<AppointmentDto | null>(null);
  const { cancel } = useAppointmentActions();
  const { data: doctors } = useQuery({
    queryKey: ['users', 'doctors-all'],
    queryFn: () => api.get<Paginated<UserDto>>('/users?role=DOCTOR&pageSize=50'),
  });
  const { data, isLoading } = useAppointments({
    from,
    to,
    status: status || undefined,
    doctorId: doctorId ? Number(doctorId) : undefined,
    page,
    pageSize: 20,
  });

  return (
    <PageContainer title="Todas las citas">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DateField
          label="Desde"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <DateField
          label="Hasta"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Estado"
          placeholder="Todos"
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Médico"
          placeholder="Todos"
          options={(doctors?.items ?? [])
            .filter((u) => u.doctor)
            .map((u) => ({ value: u.doctor?.id ?? 0, label: `${u.firstName} ${u.lastName}` }))}
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <DataTable
        caption="Citas"
        rows={data?.items ?? []}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        emptyState={<EmptyState title="No hay citas en el rango seleccionado" />}
        columns={[
          { key: 'when', header: 'Fecha y hora', render: (a) => formatDateTime(a.startsAt) },
          { key: 'patient', header: 'Paciente', render: (a) => a.patient.fullName },
          {
            key: 'doctor',
            header: 'Médico',
            render: (a) => `${a.doctor.fullName} · ${a.doctor.specialty}`,
          },
          { key: 'status', header: 'Estado', render: (a) => <StatusBadge status={a.status} /> },
          {
            key: 'actions',
            header: 'Acciones',
            className: 'text-right',
            render: (a) =>
              a.canCancel ? (
                <Button size="sm" variant="danger" onClick={() => setCancelling(a)}>
                  Cancelar
                </Button>
              ) : (
                <span className="text-content-muted">—</span>
              ),
          },
        ]}
      />
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
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
