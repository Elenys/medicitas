import { createUserSchema, listUsersSchema } from '@/lib/schemas';
import { json, parseBody, parseQuery, requireAuth, withHandler } from '@/server/http/handler';
import { createUser, listUsers } from '@/server/services/users.service';

const CREATED = 201;

/** Endpoint 22 — GET /api/v1/users */
export const GET = withHandler(async (request) => {
  await requireAuth(['ADMIN']);
  return json(await listUsers(parseQuery(request, listUsersSchema)));
});

/** Endpoint 23 — POST /api/v1/users (médico o administrador). */
export const POST = withHandler(async (request) => {
  await requireAuth(['ADMIN']);
  const input = await parseBody(request, createUserSchema);
  return json(await createUser(input), CREATED);
});
