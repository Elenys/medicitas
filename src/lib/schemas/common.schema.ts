import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';

export const DOCUMENT_TYPES = ['CC', 'TI', 'CE', 'PA'] as const;
export const GENDERS = ['FEMALE', 'MALE', 'OTHER'] as const;
export const APPOINTMENT_STATUSES = ['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
export const USER_ROLES = ['PATIENT', 'DOCTOR', 'ADMIN'] as const;

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD');

export const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:mm');

export const idParamSchema = z.coerce.number().int().positive();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/\d/, 'Debe incluir al menos un dígito');

export const emailSchema = z
  .email({ message: 'Ingrese un correo válido' })
  .max(150, 'El correo no puede superar 150 caracteres')
  .transform((value) => value.trim().toLowerCase());

export const phoneSchema = z
  .string()
  .regex(/^\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Debe tener al menos 2 caracteres')
  .max(60, 'No puede superar 60 caracteres');
