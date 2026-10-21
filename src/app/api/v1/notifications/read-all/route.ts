import { json, requireAuth, withHandler } from '@/server/http/handler';
import { markAllNotificationsRead } from '@/server/services/notifications.service';

/** Endpoint 28 — PATCH /api/v1/notifications/read-all */
export const PATCH = withHandler(async () => {
  const auth = await requireAuth();
  return json({ updated: await markAllNotificationsRead(auth.userId) });
});
