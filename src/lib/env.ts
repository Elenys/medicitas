import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

// Valida las variables de entorno al arrancar; es preferible fallar aquí
// que descubrirlo cuando un usuario intenta iniciar sesión.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z
    .string()
    .min(MIN_SECRET_LENGTH, `JWT_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres`),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Configuración de entorno inválida: ${detail}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
