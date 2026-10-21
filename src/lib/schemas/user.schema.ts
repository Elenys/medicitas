import { z } from 'zod';
import {
  DOCUMENT_TYPES,
  USER_ROLES,
  emailSchema,
  nameSchema,
  paginationSchema,
  phoneSchema,
} from './common.schema';
import { durationSchema } from './profile.schema';

const baseUser = {
  documentType: z.enum(DOCUMENT_TYPES, { message: 'Seleccione el tipo de documento' }),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{5,20}$/, 'Entre 5 y 20 caracteres, solo letras y dígitos'),
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
};

// Un administrador solo crea médicos y administradores (RN-08).
export const createUserSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('DOCTOR'),
    ...baseUser,
    specialtyId: z.coerce.number().int().positive({ message: 'Seleccione la especialidad' }),
    licenseNumber: z.string().trim().min(3, 'Ingrese la licencia').max(30),
    appointmentDurationMinutes: durationSchema,
  }),
  z.object({ role: z.literal('ADMIN'), ...baseUser }),
]);
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    isActive: z.boolean().optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
    specialtyId: z.coerce.number().int().positive().optional(),
    appointmentDurationMinutes: durationSchema.optional(),
  })
  .strict();
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersSchema = paginationSchema.extend({
  role: z.enum(USER_ROLES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  q: z.string().trim().max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersSchema>;
