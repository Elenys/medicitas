import { json, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { confirmAppointment } from '@/server/services/appointments.service';

/** Endpoint 19 — PATCH /api/v1/appointments/{id}/confirm */
export const PATCH = withHandler(async (_request, context) => {
  const auth = await requireAuth(['PATIENT']);
  const id = await parseId(context);
  return json(await confirmAppointment(auth, id, new Date()));
});
