import { z } from 'zod';
import { timeStringSchema } from './common.schema';
import { durationSchema } from './profile.schema';

const MIN_WEEKDAY = 1;
const MAX_WEEKDAY = 7;

export const scheduleItemSchema = z
  .object({
    weekday: z.coerce.number().int().min(MIN_WEEKDAY).max(MAX_WEEKDAY),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .refine((item) => item.endTime > item.startTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });
export type ScheduleItemInput = z.infer<typeof scheduleItemSchema>;

export const updateSchedulesSchema = z.object({
  schedules: z.array(scheduleItemSchema),
});
export type UpdateSchedulesInput = z.infer<typeof updateSchedulesSchema>;

export const updateDoctorSchema = z.object({
  appointmentDurationMinutes: durationSchema,
});
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
