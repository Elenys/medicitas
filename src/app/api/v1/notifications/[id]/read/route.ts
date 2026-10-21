import { noContent, parseId, requireAuth, withHandler } from '@/server/http/handler';
import { markNotificationRead } from '@/server/services/notifications.service';

/** Endpoint 27 — PATCH /api/v1/notifications/{id}/read */
export const PATCH = withHandler(async (_request, context) => {
  const auth = await requireAuth();
  await markNotificationRead(auth.userId, await parseId(context));
  return noContent();
});
