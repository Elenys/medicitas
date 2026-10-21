'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { SpecialtyChart } from '@/components/dashboard/SpecialtyChart';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/fields';
import { PageSpinner } from '@/components/ui/Spinner';
import { api, toQuery } from '@/lib/api-client';
import { addClinicDays, toClinicDateString } from '@/lib/datetime';
import type { SpecialtyReportResponse } from '@/types/api';

export default function AdminReportsPage() {
  const today = toClinicDateString(new Date());
  const [draft, setDraft] = useState({ from: addClinicDays(today, -30), to: today });
  const [range, setRange] = useState(draft);
  const { data, isFetching } = useQuery({
    queryKey: ['reports', 'specialty', range],
    queryFn: () =>
      api.get<SpecialtyReportResponse>(`/reports/appointments-by-specialty${toQuery(range)}`),
  });
  return (
    <PageContainer
      title="Reportes"
      description="Citas no canceladas por especialidad en el rango de fechas."
    >
      <Card className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setRange(draft);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <DateField
            label="Desde"
            value={draft.from}
            max={draft.to}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
          <DateField
            label="Hasta"
            value={draft.to}
            min={draft.from}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
          <Button type="submit" isLoading={isFetching}>
            Generar
          </Button>
        </form>
      </Card>
      <Card title="Citas por especialidad">
        {data ? <SpecialtyChart items={data.items} /> : <PageSpinner />}
      </Card>
    </PageContainer>
  );
}
