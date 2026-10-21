import { json, requireAuth, withHandler } from '@/server/http/handler';
import { getProfile } from '@/server/services/auth.service';

/** Endpoint 4 — GET /api/v1/auth/me. */
export const GET = withHandler(async () => {
  const auth = await requireAuth();
  return json(await getProfile(auth.userId));
});
