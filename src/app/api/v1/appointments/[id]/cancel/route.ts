import { cancelAppointmentSchema } from '@/lib/schemas';
import { json, parseBody, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { cancelAppointment } from '@/server/services/appointments.service';

/** Endpoint 20 — PATCH /api/v1/appointments/{id}/cancel */
export const PATCH = withHandler(async (request, context) => {
  const auth = await requireAuth();
  const id = await parseId(context);
  const { reason } = await parseBody(request, cancelAppointmentSchema);
  return json(await cancelAppointment(auth, { id, reason }, new Date()));
});
