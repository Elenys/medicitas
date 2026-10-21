import { createAppointmentSchema, listAppointmentsSchema } from '@/lib/schemas';
import { json, parseBody, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { createAppointment, listAppointments } from '@/server/services/appointments.service';

const CREATED = 201;

/** Endpoint 16 — GET /api/v1/appointments */
export const GET = withHandler(async (request) => {
  const auth = await requireAuth();
  const query = parseQuery(request, listAppointmentsSchema);
  return json(await listAppointments(auth, query, new Date()));
});

/** Endpoint 17 — POST /api/v1/appointments (solo pacientes). */
export const POST = withHandler(async (request) => {
  const auth = await requireAuth(['PATIENT']);
  const input = await parseBody(request, createAppointmentSchema);
  return json(await createAppointment(auth, input, new Date()), CREATED);
});
