import { availableSlotsQuerySchema } from '@/lib/schemas';
import { json, parseId, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { getDaySlots } from '@/server/services/availability.service';

/** Endpoint 12 — GET /api/v1/doctors/{id}/available-slots?date=AAAA-MM-DD */
export const GET = withHandler(async (request, context) => {
  const auth = await requireAuth();
  const id = await parseId(context);
  const { date } = parseQuery(request, availableSlotsQuerySchema);
  return json(await getDaySlots(id, date, { now: new Date(), patientId: auth.patientId }));
});
