import { prisma } from '@/server/db';
import { json, requireAuth, withHandler } from '@/server/http/handler';

/** Endpoint 8 — GET /api/v1/specialties. Catálogo completo, sin paginar. */
export const GET = withHandler(async () => {
  await requireAuth();
  const specialties = await prisma.specialty.findMany({ orderBy: { name: 'asc' } });
  return json(specialties);
});
