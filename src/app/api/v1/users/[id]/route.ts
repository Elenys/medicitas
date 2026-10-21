import { updateUserSchema } from '@/lib/schemas';
import { json, parseBody, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { updateUser } from '@/server/services/users.service';

/** Endpoint 24 — PATCH /api/v1/users/{id} */
export const PATCH = withHandler(async (request, context) => {
  const auth = await requireAuth(['ADMIN']);
  const id = await parseId(context);
  const input = await parseBody(request, updateUserSchema);
  return json(await updateUser(auth.userId, id, input));
});
