// Genera especificacion/openapi.json (OpenAPI 3.1) a partir de:
//   - catalogo.ts: los 30 endpoints, su permiso y los esquemas Zod que valida cada uno;
//   - los esquemas Zod convertidos a JSON Schema con z.toJSONSchema (mismas reglas que la API);
//   - ejemplos.json: peticiones y respuestas reales grabadas por verificar.ts.
//
//   npx tsx scripts/openapi/generar.ts

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z, type ZodType } from 'zod';
import { ENDPOINTS, GRUPOS, type Endpoint } from './catalogo';

const RAIZ = path.join(__dirname, '..', '..');
const SALIDA = path.join(RAIZ, 'especificacion', 'openapi.json');
interface Ejemplo {
  titulo: string;
  rol: string;
  cuerpo?: unknown;
  respuesta: unknown;
}
const { ejemplos } = JSON.parse(readFileSync(path.join(__dirname, 'ejemplos.json'), 'utf8')) as {
  ejemplos: Record<string, Record<string, Ejemplo[]>>;
};
const { version } = JSON.parse(readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));

const DESCRIPCION_CODIGO: Record<number, string> = {
  200: 'Operación exitosa',
  201: 'Recurso creado',
  204: 'Operación exitosa, sin contenido',
  400: 'Datos inválidos (VALIDATION_ERROR): `details` indica el error de cada campo',
  401: 'Sin sesión válida o credenciales incorrectas',
  403: 'El rol o el dueño del recurso no permiten la operación',
  404: 'El recurso no existe (NOT_FOUND)',
  409: 'Conflicto con el estado actual de los datos',
};

const PERMISO: Record<string, string> = {
  PUBLICO: 'Público (no requiere sesión)',
  AUTH: 'Cualquier usuario con sesión',
  PATIENT: 'Solo paciente',
  DOCTOR: 'Solo médico',
  ADMIN: 'Solo administrador',
};

/** Esquema Zod → JSON Schema de lo que el cliente debe enviar. */
function jsonSchema(esquema: ZodType): Record<string, unknown> {
  const { $schema: _omitido, ...resto } = z.toJSONSchema(esquema, {
    io: 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return resto;
}

/** Códigos de error que puede devolver el endpoint, con los códigos de dominio de cada uno. */
function errores(e: Endpoint): Map<number, string[]> {
  const mapa = new Map<number, string[]>();
  const agregar = (codigo: number, ...dominio: string[]) =>
    mapa.set(codigo, [...(mapa.get(codigo) ?? []), ...dominio]);
  if (e.cuerpo || e.consulta || e.ruta.includes('{id}')) agregar(400, 'VALIDATION_ERROR');
  if (e.permiso !== 'PUBLICO') agregar(401, 'UNAUTHENTICATED');
  if (['PATIENT', 'DOCTOR', 'ADMIN'].includes(e.permiso) || e.propietario)
    agregar(403, 'FORBIDDEN');
  for (const [codigo, lista] of Object.entries(e.errores ?? {}))
    agregar(Number(codigo), ...(lista ?? []));
  return new Map([...mapa.entries()].sort(([a], [b]) => a - b));
}

/** Título del ejemplo con el rol que hizo la petición, sin repetirlo si ya lo dice. */
const resumen = (x: Ejemplo): string =>
  x.titulo.includes(x.rol) ? x.titulo : `${x.titulo} (${x.rol})`;

/** Ejemplos reales grabados para un código de respuesta. */
function ejemplosDe(e: Endpoint, codigo: number) {
  const lista: Ejemplo[] = ejemplos[`${e.metodo} ${e.ruta}`]?.[codigo] ?? [];
  return lista.map((x, i) => ({ clave: `ej${i + 1}`, ...x }));
}

function operacion(e: Endpoint) {
  const parametros: unknown[] = [];
  if (e.ruta.includes('{id}')) {
    parametros.push({
      name: 'id',
      in: 'path',
      required: true,
      description: 'Identificador numérico',
      schema: { type: 'integer', minimum: 1 },
    });
  }
  if (e.consulta) {
    const esquema = jsonSchema(e.consulta) as {
      properties: Record<string, unknown>;
      required?: string[];
    };
    for (const [nombre, propiedad] of Object.entries(esquema.properties)) {
      parametros.push({
        name: nombre,
        in: 'query',
        required: esquema.required?.includes(nombre) ?? false,
        schema: propiedad,
      });
    }
  }

  const exitos = ejemplosDe(e, e.exito);
  const respuestas: Record<string, unknown> = {};
  respuestas[e.exito] = {
    description: DESCRIPCION_CODIGO[e.exito],
    ...(e.exito === 204
      ? {}
      : {
          content: {
            'application/json': {
              examples: Object.fromEntries(
                exitos.map((x) => [x.clave, { summary: resumen(x), value: x.respuesta }]),
              ),
            },
          },
        }),
  };
  for (const [codigo, dominio] of errores(e)) {
    const reales = ejemplosDe(e, codigo);
    respuestas[codigo] = {
      description: `${DESCRIPCION_CODIGO[codigo]}. Códigos: ${dominio.join(', ')}`,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          ...(reales.length
            ? {
                examples: Object.fromEntries(
                  reales.map((x) => [x.clave, { summary: resumen(x), value: x.respuesta }]),
                ),
              }
            : {}),
        },
      },
    };
  }

  const cuerpos = exitos.filter((x) => x.cuerpo !== undefined);
  return {
    operationId: `e${String(e.n).padStart(2, '0')}`,
    tags: [e.grupo],
    summary: `${e.n}. ${e.resumen}`,
    description: `${e.descripcion}\n\n**Permiso:** ${PERMISO[e.permiso]}${e.propietario ? ', y el recurso debe pertenecer a quien lo pide' : ''}.`,
    'x-permiso': e.permiso,
    ...(e.permiso === 'PUBLICO' ? { security: [] } : {}),
    ...(parametros.length ? { parameters: parametros } : {}),
    ...(e.cuerpo
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: jsonSchema(e.cuerpo),
                ...(cuerpos.length
                  ? {
                      examples: Object.fromEntries(
                        cuerpos.map((x) => [x.clave, { summary: x.titulo, value: x.cuerpo }]),
                      ),
                    }
                  : {}),
              },
            },
          },
        }
      : {}),
    responses: respuestas,
  };
}

const paths: Record<string, Record<string, unknown>> = {};
for (const e of ENDPOINTS) (paths[e.ruta] ??= {})[e.metodo.toLowerCase()] = operacion(e);

const especificacion = {
  openapi: '3.1.0',
  info: {
    title: 'API de MediCitas',
    version,
    description: [
      'Servicios web REST del sistema de citas médicas MediCitas (Next.js Route Handlers, `/api/v1`).',
      '',
      '- Peticiones y respuestas en JSON. Fechas con hora en ISO-8601 con zona; fechas sin hora como `AAAA-MM-DD` (zona America/Bogota).',
      '- **Sesión:** `POST /api/v1/auth/login` devuelve la cookie httpOnly `medicitas_session` (JWT). Las demás peticiones la envían de vuelta; no se usa la cabecera Authorization.',
      '- **Errores:** siempre `{ "error": { "code", "message", "details?" } }`, con el mensaje en español para el usuario final.',
      '- **Listados paginados:** `?page=1&pageSize=10` (máximo 50) y respuesta `{ items, page, pageSize, total, totalPages }`.',
      '',
      'Los esquemas de entrada se generan de los mismos esquemas Zod que valida la API, y los ejemplos son respuestas reales de la API con los datos de demostración.',
    ].join('\n'),
  },
  servers: [
    { url: '/', description: 'El mismo servidor que muestra esta documentación' },
    { url: 'http://localhost:3000', description: 'Docker Compose local' },
  ],
  security: [{ sesion: [] }],
  tags: Object.entries(GRUPOS).map(([name, description]) => ({ name, description })),
  paths,
  components: {
    securitySchemes: {
      sesion: {
        type: 'apiKey',
        in: 'cookie',
        name: 'medicitas_session',
        description: 'JWT emitido al registrarse o iniciar sesión',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHENTICATED',
                  'INVALID_CREDENTIALS',
                  'FORBIDDEN',
                  'CANCELLATION_WINDOW_CLOSED',
                  'NOT_FOUND',
                  'EMAIL_ALREADY_EXISTS',
                  'DOCUMENT_ALREADY_EXISTS',
                  'LICENSE_ALREADY_EXISTS',
                  'SLOT_TAKEN',
                  'PATIENT_APPOINTMENT_TOO_CLOSE',
                  'INVALID_STATE_TRANSITION',
                  'SCHEDULE_OVERLAP',
                  'INTERNAL_ERROR',
                ],
              },
              message: { type: 'string', description: 'Mensaje en español para el usuario final' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { field: { type: 'string' }, message: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  },
};

writeFileSync(SALIDA, JSON.stringify(especificacion, null, 2) + '\n');
const operaciones = Object.values(paths).reduce((total, p) => total + Object.keys(p).length, 0);
console.log(
  `Escrito ${path.relative(RAIZ, SALIDA)}: ${operaciones} operaciones en ${Object.keys(paths).length} rutas`,
);
