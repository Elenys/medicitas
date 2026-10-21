import { changePasswordSchema } from '@/lib/schemas';
import { noContent, parseBody, requireAuth, withHandler } from '@/server/http/handler';
import { changePassword } from '@/server/services/auth.service';

/** Endpoint 7 — PATCH /api/v1/profile/password. */
export const PATCH = withHandler(async (request) => {
  const auth = await requireAuth();
  const input = await parseBody(request, changePasswordSchema);
  await changePassword(auth.userId, input);
  return noContent();
});
