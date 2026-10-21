import { json, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { getDoctorDetail } from '@/server/services/availability.service';

/** Endpoint 10 — GET /api/v1/doctors/{id} */
export const GET = withHandler(async (_request, context) => {
  await requireAuth();
  const id = await parseId(context);
  return json(await getDoctorDetail(id));
});
