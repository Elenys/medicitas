import { z } from 'zod';
import { paginationSchema } from '@/lib/schemas';
import { json, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { listNotifications } from '@/server/services/notifications.service';

const querySchema = paginationSchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

/** Endpoint 26 — GET /api/v1/notifications */
export const GET = withHandler(async (request) => {
  const auth = await requireAuth();
  return json(await listNotifications(auth.userId, parseQuery(request, querySchema)));
});
