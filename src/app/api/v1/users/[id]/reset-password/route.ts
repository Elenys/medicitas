import { json, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { resetPassword } from '@/server/services/users.service';

/** Endpoint 25 — POST /api/v1/users/{id}/reset-password */
export const POST = withHandler(async (_request, context) => {
  await requireAuth(['ADMIN']);
  const id = await parseId(context);
  return json({ temporaryPassword: await resetPassword(id) });
});
