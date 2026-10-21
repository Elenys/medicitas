import { completeAppointmentSchema } from '@/lib/schemas';
import { json, parseBody, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { completeAppointment } from '@/server/services/appointments.service';

/** Endpoint 21 — PATCH /api/v1/appointments/{id}/complete */
export const PATCH = withHandler(async (request, context) => {
  const auth = await requireAuth(['DOCTOR']);
  const id = await parseId(context);
  const { notes } = await parseBody(request, completeAppointmentSchema);
  return json(await completeAppointment(auth, { id, notes }, new Date()));
});
