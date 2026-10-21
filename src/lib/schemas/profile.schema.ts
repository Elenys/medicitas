import { z } from 'zod';
import { MAX_APPOINTMENT_DURATION_MINUTES, MIN_APPOINTMENT_DURATION_MINUTES } from '../constants';
import { nameSchema, phoneSchema } from './common.schema';

export const durationSchema = z.coerce
  .number()
  .int()
  .min(MIN_APPOINTMENT_DURATION_MINUTES, `Mínimo ${MIN_APPOINTMENT_DURATION_MINUTES} minutos`)
  .max(MAX_APPOINTMENT_DURATION_MINUTES, `Máximo ${MAX_APPOINTMENT_DURATION_MINUTES} minutos`);

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
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
    appointmentDurationMinutes: durationSchema.optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
