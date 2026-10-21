import { listDoctorsSchema } from '@/lib/schemas';
import { json, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { listDoctors } from '@/server/services/availability.service';

/** Endpoint 9 — GET /api/v1/doctors?specialtyId= */
export const GET = withHandler(async (request) => {
  const auth = await requireAuth();
  const query = parseQuery(request, listDoctorsSchema);
  return json(await listDoctors(query, new Date(), auth.patientId));
});
