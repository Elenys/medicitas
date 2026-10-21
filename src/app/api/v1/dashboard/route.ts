import { json, requireAuth, withHandler } from '@/server/http/handler';
import { getDashboard } from '@/server/services/reports.service';

/** Endpoint 29 — GET /api/v1/dashboard (responde según el rol). */
export const GET = withHandler(async () => {
  const auth = await requireAuth();
  return json(await getDashboard(auth, new Date()));
});
