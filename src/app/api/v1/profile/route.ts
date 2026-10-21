import { updateProfileSchema } from '@/lib/schemas';
import { json, parseBody, requireAuth, withHandler } from '@/server/http/handler';
import { getProfile, updateProfile } from '@/server/services/auth.service';

/** Endpoint 5 — GET /api/v1/profile. */
export const GET = withHandler(async () => {
  const auth = await requireAuth();
  return json(await getProfile(auth.userId));
});

/** Endpoint 6 — PATCH /api/v1/profile. */
export const PATCH = withHandler(async (request) => {
  const auth = await requireAuth();
  const input = await parseBody(request, updateProfileSchema);
  return json(await updateProfile(auth.userId, input));
});
