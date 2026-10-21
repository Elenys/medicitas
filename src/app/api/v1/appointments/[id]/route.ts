import { json, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { getAppointment } from '@/server/services/appointments.service';

/** Endpoint 18 — GET /api/v1/appointments/{id} */
export const GET = withHandler(async (_request, context) => {
  const auth = await requireAuth();
  const id = await parseId(context);
  return json(await getAppointment(auth, id, new Date()));
});
