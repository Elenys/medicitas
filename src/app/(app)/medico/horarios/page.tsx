'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DurationSelector } from '@/components/schedules/DurationSelector';
import { ScheduleEditor } from '@/components/schedules/ScheduleEditor';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { countWeeklySlots, findScheduleOverlap } from '@/lib/availability';
import type { ScheduleDto, SchedulesResponse } from '@/types/api';

export default function DoctorSchedulesPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get<SchedulesResponse>('/doctors/me/schedules'),
  });
  if (isLoading || !data) return <PageSpinner />;
  // La clave reinicia el formulario cuando llegan datos nuevos del servidor.
  return <SchedulesForm key={dataUpdatedAt} initial={data} />;
}

function SchedulesForm({ initial }: { initial: SchedulesResponse }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<ScheduleDto[]>(initial.schedules);
  const [duration, setDuration] = useState(initial.appointmentDurationMinutes);
  const [warning, setWarning] = useState<string>();

  const errors: Record<number, string> = {};
  schedules.forEach((s, i) => {
    if (s.endTime <= s.startTime) errors[i] = 'El fin debe ser posterior al inicio';
  });
  const overlap = findScheduleOverlap(schedules);
  const invalidate = (): Promise<void> =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['schedules'] }),
      queryClient.invalidateQueries({ queryKey: ['availability'] }),
      queryClient.invalidateQueries({ queryKey: ['doctors'] }),
    ]).then(() => undefined);

  const save = useMutation({
    mutationFn: async () => {
      if (duration !== initial.appointmentDurationMinutes)
        await api.patch('/doctors/me', { appointmentDurationMinutes: duration });
      return api.put<SchedulesResponse>('/doctors/me/schedules', {
        schedules: schedules.map(({ weekday, startTime, endTime }) => ({
          weekday,
          startTime,
          endTime,
        })),
      });
    },
    onSuccess: async (result) => {
      setWarning(result.warning?.message);
      toast.showSuccess('Configuración guardada.');
      await invalidate();
    },
    onError: (e) => toast.showError(e.message),
  });

  return (
    <PageContainer
      title="Horarios de atención"
      description="La disponibilidad que ven los pacientes se genera con esta configuración."
    >
      <div className="flex flex-col gap-6">
        {warning && <Alert variant="warning">{warning}</Alert>}
        {overlap && (
          <Alert variant="error">
            Dos franjas del mismo día se solapan. Corríjalas antes de guardar.
          </Alert>
        )}
        <Card>
          <DurationSelector value={duration} onChange={setDuration} />
        </Card>
        <Card title="Días y franjas">
          <ScheduleEditor schedules={schedules} errors={errors} onChange={setSchedules} />
        </Card>
        <div className="rounded-card border-border bg-surface flex flex-wrap items-center justify-between gap-4 border p-4">
          <p className="text-content-muted">
            Con esta configuración usted ofrece{' '}
            <strong className="text-content">{countWeeklySlots(schedules, duration)} cupos</strong>{' '}
            por semana.
          </p>
          <Button
            onClick={() => save.mutate()}
            isLoading={save.isPending}
            disabled={Object.keys(errors).length > 0 || overlap !== null}
          >
            Guardar configuración
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
