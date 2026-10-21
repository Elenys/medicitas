import { loginSchema } from '@/lib/schemas';
import { json, parseBody, withHandler } from '@/server/http/handler';
import { login } from '@/server/services/auth.service';
import { setSessionCookie } from '@/server/session';

/** Endpoint 2 — POST /api/v1/auth/login (público). */
export const POST = withHandler(async (request) => {
  const input = await parseBody(request, loginSchema);
  const user = await login(input);
  await setSessionCookie({ userId: user.id, role: user.role });
  return json(user);
});
