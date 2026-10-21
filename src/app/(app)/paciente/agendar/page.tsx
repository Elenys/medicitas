'use client';

import { useRouter } from 'next/navigation';
import { AppointmentWizard } from '@/components/appointments/AppointmentWizard';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BookPage() {
  const router = useRouter();
  return (
    <PageContainer
      title="Agendar cita"
      description="Elija la especialidad y el médico, luego el día y la hora, y confirme."
    >
      <AppointmentWizard onCompleted={(a) => router.push(`/paciente/citas/${a.id}`)} />
    </PageContainer>
  );
}
