'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CalendarDays, CalendarX2, Users } from 'lucide-react';
import { SpecialtyChart } from '@/components/dashboard/SpecialtyChart';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { api } from '@/lib/api-client';
import type { DashboardResponse, SpecialtyReportResponse } from '@/types/api';

export default function AdminHomePage() {
  const { data } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
  });
  const { data: report } = useQuery({
    queryKey: ['reports', 'specialty', 'default'],
    queryFn: () => api.get<SpecialtyReportResponse>('/reports/appointments-by-specialty'),
  });
  const dash = data?.role === 'ADMIN' ? data : undefined;
  if (!dash) return <PageSpinner />;
  return (
    <PageContainer title="Panel administrativo">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Citas de hoy" value={dash.appointmentsToday} icon={CalendarClock} />
        <KpiCard
          label="Citas de la semana"
          value={dash.appointmentsThisWeek}
          icon={CalendarDays}
          tone="neutral"
        />
        <KpiCard
          label="Canceladas del mes"
          value={dash.cancelledThisMonth}
          icon={CalendarX2}
          tone="danger"
        />
        <KpiCard
          label="Pacientes registrados"
          value={dash.registeredPatients}
          icon={Users}
          tone="success"
        />
      </div>
      <Card title="Citas por especialidad — últimos 30 días" className="mt-6">
        {report ? <SpecialtyChart items={report.items} /> : <PageSpinner />}
      </Card>
    </PageContainer>
  );
}
