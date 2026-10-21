import { noContent, withHandler } from '@/server/http/handler';
import { clearSessionCookie } from '@/server/session';

/** Endpoint 3 — POST /api/v1/auth/logout. */
export const POST = withHandler(async () => {
  await clearSessionCookie();
  return noContent();
});
