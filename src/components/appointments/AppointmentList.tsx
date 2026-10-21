'use client';

import { CalendarX2 } from 'lucide-react';
import { useState } from 'react';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useAppointments, type AppointmentFilters } from '@/hooks/useAppointments';
import type { UserRole } from '@/lib/appointment-rules';
import type { AppointmentDto } from '@/types/api';

export interface AppointmentListProps {
  filters: AppointmentFilters;
  viewerRole: UserRole;
  emptyTitle: string;
  emptyMessage?: string;
  detailBase?: string;
  onConfirm?: (a: AppointmentDto) => void;
  onCancel?: (a: AppointmentDto) => void;
  onComplete?: (a: AppointmentDto) => void;
}

/** Agrupa carga, error, vacío, listado y paginación (05 §7). */
export function AppointmentList({
  filters,
  viewerRole,
  emptyTitle,
  emptyMessage,
  detailBase,
  onConfirm,
  onCancel,
  onComplete,
}: AppointmentListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAppointments({ ...filters, page });

  if (isLoading) return <PageSpinner />;
  if (isError || !data)
    return (
      <Alert
        variant="error"
        action={
          <Button size="sm" variant="secondary" onClick={() => void refetch()}>
            Reintentar
          </Button>
        }
      >
        No fue posible cargar las citas.
      </Alert>
    );
  if (data.items.length === 0)
    return <EmptyState icon={CalendarX2} title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="flex flex-col gap-3">
      {data.items.map((a) => (
        <AppointmentCard
          key={a.id}
          appointment={a}
          viewerRole={viewerRole}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onComplete={onComplete}
          detailHref={detailBase ? `${detailBase}/${a.id}` : undefined}
        />
      ))}
      <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
    </div>
  );
}
