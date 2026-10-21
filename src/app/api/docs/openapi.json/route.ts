import especificacion from '../../../../../especificacion/openapi.json';

/** Especificación OpenAPI de la API (generada con scripts/openapi). Pública. */
export function GET(): Response {
  return Response.json(especificacion);
}
