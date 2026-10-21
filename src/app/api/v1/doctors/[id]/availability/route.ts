import { availabilityQuerySchema } from '@/lib/schemas';
import { json, parseId, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { getMonthAvailability } from '@/server/services/availability.service';

/** Endpoint 11 — GET /api/v1/doctors/{id}/availability?month=AAAA-MM */
export const GET = withHandler(async (request, context) => {
  const auth = await requireAuth();
  const id = await parseId(context);
  const { month } = parseQuery(request, availabilityQuerySchema);
  return json(
    await getMonthAvailability(id, month, { now: new Date(), patientId: auth.patientId }),
  );
});
