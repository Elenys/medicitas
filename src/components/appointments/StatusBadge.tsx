import type { AppointmentStatus } from '@/lib/appointment-rules';
import { STATUS_LABELS } from '@/lib/labels';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';

// Único mapeo estado → color de todo el sistema (06 §1.2). Siempre lleva texto.
const VARIANT: Record<AppointmentStatus, BadgeVariant> = {
  BOOKED: 'primary',
  CONFIRMED: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
