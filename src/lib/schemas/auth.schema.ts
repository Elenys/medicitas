import { z } from 'zod';
import {
  DOCUMENT_TYPES,
  GENDERS,
  dateStringSchema,
  emailSchema,
  nameSchema,
  passwordSchema,
  phoneSchema,
} from './common.schema';

const MIN_BIRTH_DATE = '1900-01-01';

export const registerSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES, { message: 'Seleccione el tipo de documento' }),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{5,20}$/, 'Entre 5 y 20 caracteres, solo letras y dígitos'),
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  birthDate: dateStringSchema.refine(
    (value) => value >= MIN_BIRTH_DATE && value <= new Date().toISOString().slice(0, 10),
    'La fecha de nacimiento no es válida',
  ),
  gender: z.enum(GENDERS, { message: 'Seleccione el género' }),
  address: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  healthProvider: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Versión de formulario: añade la confirmación de contraseña. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingrese su contraseña'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingrese su contraseña actual'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña debe ser distinta de la actual',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const changePasswordFormSchema = changePasswordSchema
  .safeExtend({ confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;
