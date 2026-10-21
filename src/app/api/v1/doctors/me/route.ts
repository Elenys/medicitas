import { updateDoctorSchema } from '@/lib/schemas';
import { json, parseBody, requireAuth, withHandler } from '@/server/http/handler';
import { updateDoctorDuration } from '@/server/services/schedules.service';

/** Endpoint 15 — PATCH /api/v1/doctors/me */
export const PATCH = withHandler(async (request) => {
  const auth = await requireAuth(['DOCTOR']);
  const input = await parseBody(request, updateDoctorSchema);
  return json(await updateDoctorDuration(auth.doctorId ?? -1, input.appointmentDurationMinutes));
});
