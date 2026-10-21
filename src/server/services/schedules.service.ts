import { countWeeklySlots, findScheduleOverlap, type ScheduleInput } from '@/lib/availability';
import {
  prismaTimeToString,
  stringToPrismaTime,
  toClinicDateString,
  toClinicTimeString,
  getIsoWeekday,
} from '@/lib/datetime';
import type { UpdateSchedulesInput } from '@/lib/schemas';
import type { SchedulesResponse } from '@/types/api';
import { prisma } from '../db';
import { NotFoundError, ScheduleOverlapError } from '../http/errors';

async function loadDoctor(
  doctorId: number,
): Promise<{ appointmentDurationMinutes: number; schedules: ScheduleInput[] }> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { schedules: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }] } },
  });
  if (!doctor) throw new NotFoundError();
  return {
    appointmentDurationMinutes: doctor.appointmentDurationMinutes,
    schedules: doctor.schedules.map((s) => ({
      weekday: s.weekday,
      startTime: prismaTimeToString(s.startTime),
      endTime: prismaTimeToString(s.endTime),
    })),
  };
}

export async function getSchedules(doctorId: number): Promise<SchedulesResponse> {
  const doctor = await loadDoctor(doctorId);
  return {
    ...doctor,
    weeklySlots: countWeeklySlots(doctor.schedules, doctor.appointmentDurationMinutes),
  };
}

/** Una cita queda "fuera" si su hora local no cae dentro de ninguna franja del nuevo horario (RN-17). */
function fitsSchedules(startsAt: Date, endsAt: Date, schedules: ScheduleInput[]): boolean {
  const weekday = getIsoWeekday(toClinicDateString(startsAt));
  const start = toClinicTimeString(startsAt);
  const end = toClinicTimeString(endsAt);
  return schedules.some(
    (s) => s.weekday === weekday && s.startTime <= start && end <= s.endTime && end > '00:00',
  );
}

async function countAffectedAppointments(
  doctorId: number,
  schedules: ScheduleInput[],
  now: Date,
): Promise<number> {
  const future = await prisma.appointment.findMany({
    where: { doctorId, status: { in: ['BOOKED', 'CONFIRMED'] }, startsAt: { gte: now } },
    select: { startsAt: true, endsAt: true },
  });
  return future.filter((a) => !fitsSchedules(a.startsAt, a.endsAt, schedules)).length;
}

/** CU-15: reemplaza el conjunto completo. Las citas existentes nunca se alteran (RN-17). */
export async function replaceSchedules(
  doctorId: number,
  input: UpdateSchedulesInput,
  now: Date,
): Promise<SchedulesResponse> {
  const overlap = findScheduleOverlap(input.schedules);
  if (overlap) throw new ScheduleOverlapError();

  await prisma.$transaction(async (tx) => {
    await tx.doctorSchedule.deleteMany({ where: { doctorId } });
    if (input.schedules.length > 0) {
      await tx.doctorSchedule.createMany({
        data: input.schedules.map((s) => ({
          doctorId,
          weekday: s.weekday,
          startTime: stringToPrismaTime(s.startTime),
          endTime: stringToPrismaTime(s.endTime),
        })),
      });
    }
  });

  const affected = await countAffectedAppointments(doctorId, input.schedules, now);
  const response = await getSchedules(doctorId);
  if (affected === 0) return response;
  return {
    ...response,
    warning: {
      affectedAppointments: affected,
      message: `${affected} cita(s) ya agendada(s) quedan fuera de la nueva jornada. Se conservan y siguen en su agenda.`,
    },
  };
}

/** Cambiar la duración no altera las citas ya agendadas (RN-09). */
export async function updateDoctorDuration(
  doctorId: number,
  minutes: number,
): Promise<SchedulesResponse> {
  await prisma.doctor.update({
    where: { id: doctorId },
    data: { appointmentDurationMinutes: minutes },
  });
  return getSchedules(doctorId);
}
