import { reportRangeSchema } from '@/lib/schemas';
import { json, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { getAppointmentsBySpecialty } from '@/server/services/reports.service';

/** Endpoint 30 — GET /api/v1/reports/appointments-by-specialty?from=&to= */
export const GET = withHandler(async (request) => {
  await requireAuth(['ADMIN']);
  return json(await getAppointmentsBySpecialty(parseQuery(request, reportRangeSchema), new Date()));
});
