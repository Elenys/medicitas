import { z } from 'zod';
import { MAX_NOTES_LENGTH, MAX_REASON_LENGTH, MIN_CANCELLATION_REASON_LENGTH } from '../constants';
import { APPOINTMENT_STATUSES, dateStringSchema, paginationSchema } from './common.schema';

export const createAppointmentSchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  startsAt: z.iso.datetime({ offset: true, message: 'Fecha y hora inválidas' }),
  reason: z
    .string()
    .trim()
    .max(MAX_REASON_LENGTH, `Máximo ${MAX_REASON_LENGTH} caracteres`)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(MIN_CANCELLATION_REASON_LENGTH, 'Indique el motivo de la cancelación')
    .max(MAX_REASON_LENGTH, `Máximo ${MAX_REASON_LENGTH} caracteres`),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const completeAppointmentSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(MAX_NOTES_LENGTH, `Máximo ${MAX_NOTES_LENGTH} caracteres`)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type CompleteAppointmentInput = z.infer<typeof completeAppointmentSchema>;

export const listAppointmentsSchema = paginationSchema.extend({
  scope: z.enum(['upcoming', 'history']).optional(),
  date: dateStringSchema.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  patientId: z.coerce.number().int().positive().optional(),
  includeCancelled: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsSchema>;

export const availabilityQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes debe tener el formato AAAA-MM'),
});

export const availableSlotsQuerySchema = z.object({ date: dateStringSchema });

export const listDoctorsSchema = paginationSchema.extend({
  specialtyId: z.coerce.number().int().positive().optional(),
});

export const reportRangeSchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});
