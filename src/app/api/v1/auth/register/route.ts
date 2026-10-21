import { registerSchema } from '@/lib/schemas';
import { json, parseBody, withHandler } from '@/server/http/handler';
import { registerPatient } from '@/server/services/auth.service';
import { setSessionCookie } from '@/server/session';

const CREATED = 201;

/** Endpoint 1 — POST /api/v1/auth/register (público). */
export const POST = withHandler(async (request) => {
  const input = await parseBody(request, registerSchema);
  const user = await registerPatient(input);
  await setSessionCookie({ userId: user.id, role: user.role });
  return json(user, CREATED);
});
