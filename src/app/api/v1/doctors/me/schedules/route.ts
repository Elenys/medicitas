import { updateSchedulesSchema } from '@/lib/schemas';
import { json, parseBody, requireAuth, withHandler } from '@/server/http/handler';
import { getSchedules, replaceSchedules } from '@/server/services/schedules.service';

/** Endpoint 13 — GET /api/v1/doctors/me/schedules */
export const GET = withHandler(async () => {
  const auth = await requireAuth(['DOCTOR']);
  return json(await getSchedules(auth.doctorId ?? -1));
});

/** Endpoint 14 — PUT /api/v1/doctors/me/schedules (reemplaza el conjunto completo). */
export const PUT = withHandler(async (request) => {
  const auth = await requireAuth(['DOCTOR']);
  const input = await parseBody(request, updateSchedulesSchema);
  return json(await replaceSchedules(auth.doctorId ?? -1, input, new Date()));
});
