import type { Prisma } from '@prisma/client';
import {
  countAvailableSlots,
  generateDaySlots,
  getBookingWindow,
  padIntervals,
  type BusyInterval,
  type ScheduleInput,
} from '@/lib/availability';
import {
  MAX_ADVANCE_BOOKING_DAYS,
  MS_PER_MINUTE,
  PATIENT_APPOINTMENT_GAP_MINUTES,
} from '@/lib/constants';
import {
  addClinicDays,
  getClinicDayBounds,
  prismaTimeToString,
  toClinicDateString,
} from '@/lib/datetime';
import { fullName } from '@/lib/utils';
import type {
  AvailabilityResponse,
  AvailableSlotsResponse,
  DoctorSummary,
  Paginated,
} from '@/types/api';
import { prisma } from '../db';
import { NotFoundError } from '../http/errors';

const doctorInclude = {
  user: { select: { firstName: true, lastName: true, isActive: true } },
  specialty: true,
  schedules: true,
} satisfies Prisma.DoctorInclude;

type DoctorRow = Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>;

/** Momento de la consulta y, si quien consulta es paciente, su agenda (RN-21.7). */
export interface BookingViewer {
  now: Date;
  patientId?: number | null;
}

export interface DoctorContext {
  id: number;
  userId: number;
  fullName: string;
  specialty: { id: number; name: string };
  durationMinutes: number;
  schedules: ScheduleInput[];
}

export function toDoctorContext(row: DoctorRow): DoctorContext {
  return {
    id: row.id,
    userId: row.userId,
    fullName: fullName(row.user),
    specialty: { id: row.specialty.id, name: row.specialty.name },
    durationMinutes: row.appointmentDurationMinutes,
    schedules: row.schedules.map((s) => ({
      weekday: s.weekday,
      startTime: prismaTimeToString(s.startTime),
      endTime: prismaTimeToString(s.endTime),
    })),
  };
}

/** Un médico es reservable si está activo y tiene horarios (RN-16). */
export async function requireBookableDoctor(doctorId: number): Promise<DoctorContext> {
  const row = await prisma.doctor.findUnique({ where: { id: doctorId }, include: doctorInclude });
  if (!row || !row.user.isActive || row.schedules.length === 0) {
    throw new NotFoundError('El médico no está disponible para agendar.');
  }
  return toDoctorContext(row);
}

/** Citas activas del médico que tocan el intervalo [from, to). */
export async function getBusyIntervals(
  doctorId: number,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  return prisma.appointment.findMany({
    where: { doctorId, status: { not: 'CANCELLED' }, startsAt: { lt: to }, endsAt: { gt: from } },
    select: { startsAt: true, endsAt: true },
  });
}

/**
 * Citas activas del propio paciente, ampliadas con el margen de RN-21.7. Se suman
 * a la ocupación del médico para que la interfaz no ofrezca cupos que la reserva
 * va a rechazar. Para quien no es paciente (médico o admin consultando) no hay margen.
 */
export async function getPatientBusyIntervals(
  patientId: number | null | undefined,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  if (!patientId) return [];
  const margin = PATIENT_APPOINTMENT_GAP_MINUTES;
  const rows = await prisma.appointment.findMany({
    where: {
      patientId,
      status: { not: 'CANCELLED' },
      startsAt: { lt: new Date(to.getTime() + margin * MS_PER_MINUTE) },
      endsAt: { gt: new Date(from.getTime() - margin * MS_PER_MINUTE) },
    },
    select: { startsAt: true, endsAt: true },
  });
  return padIntervals(rows, margin);
}

function findNextAvailableDate(ctx: DoctorContext, busy: BusyInterval[], now: Date): string | null {
  const today = toClinicDateString(now);
  for (let offset = 0; offset <= MAX_ADVANCE_BOOKING_DAYS; offset += 1) {
    const date = addClinicDays(today, offset);
    const count = countAvailableSlots({
      date,
      schedules: ctx.schedules,
      durationMinutes: ctx.durationMinutes,
      busy,
      now,
    });
    if (count > 0) return date;
  }
  return null;
}

async function summarizeDoctor(
  row: DoctorRow,
  now: Date,
  patientBusy: BusyInterval[],
): Promise<DoctorSummary> {
  const ctx = toDoctorContext(row);
  const { earliest, latest } = getBookingWindow(now);
  const busy = [...(await getBusyIntervals(ctx.id, earliest, latest)), ...patientBusy];
  return {
    id: ctx.id,
    fullName: ctx.fullName,
    specialty: ctx.specialty,
    appointmentDurationMinutes: ctx.durationMinutes,
    nextAvailableDate: findNextAvailableDate(ctx, busy, now),
  };
}

/** CU-07: solo médicos activos con al menos una franja (RN-16). */
export async function listDoctors(
  query: { specialtyId?: number; page: number; pageSize: number },
  now: Date,
  patientId?: number | null,
): Promise<Paginated<DoctorSummary>> {
  const where: Prisma.DoctorWhereInput = {
    specialtyId: query.specialtyId,
    user: { isActive: true },
    schedules: { some: {} },
  };
  const [rows, total] = await Promise.all([
    prisma.doctor.findMany({
      where,
      include: doctorInclude,
      orderBy: [{ specialty: { name: 'asc' } }, { user: { lastName: 'asc' } }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.doctor.count({ where }),
  ]);
  const { earliest, latest } = getBookingWindow(now);
  const patientBusy = await getPatientBusyIntervals(patientId, earliest, latest);
  const items = await Promise.all(rows.map((row) => summarizeDoctor(row, now, patientBusy)));
  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getDoctorDetail(doctorId: number): Promise<DoctorContext> {
  const row = await prisma.doctor.findUnique({ where: { id: doctorId }, include: doctorInclude });
  if (!row) throw new NotFoundError('El médico no existe.');
  return toDoctorContext(row);
}

/** CU-08: días del mes con cupo, dentro de la ventana de reserva. */
export async function getMonthAvailability(
  doctorId: number,
  month: string,
  viewer: BookingViewer,
): Promise<AvailabilityResponse> {
  const { now, patientId } = viewer;
  const ctx = await requireBookableDoctor(doctorId);
  const firstDay = `${month}-01`;
  const monthStart = getClinicDayBounds(firstDay).start;
  const monthEnd = getClinicDayBounds(addClinicDays(firstDay, 31)).start;
  const busy = [
    ...(await getBusyIntervals(doctorId, monthStart, monthEnd)),
    ...(await getPatientBusyIntervals(patientId, monthStart, monthEnd)),
  ];
  const today = toClinicDateString(now);
  const lastBookable = addClinicDays(today, MAX_ADVANCE_BOOKING_DAYS);

  const days: AvailabilityResponse['days'] = [];
  for (let date = firstDay; date.startsWith(month); date = addClinicDays(date, 1)) {
    if (date < today || date > lastBookable) continue;
    const availableSlots = countAvailableSlots({
      date,
      schedules: ctx.schedules,
      durationMinutes: ctx.durationMinutes,
      busy,
      now,
    });
    days.push({ date, availableSlots });
  }
  return { month, days };
}

/** CU-09: todos los cupos de la jornada, marcando cuáles están libres. */
export async function getDaySlots(
  doctorId: number,
  date: string,
  viewer: BookingViewer,
): Promise<AvailableSlotsResponse> {
  const { now, patientId } = viewer;
  const ctx = await requireBookableDoctor(doctorId);
  const bounds = getClinicDayBounds(date);
  const busy = [
    ...(await getBusyIntervals(doctorId, bounds.start, bounds.end)),
    ...(await getPatientBusyIntervals(patientId, bounds.start, bounds.end)),
  ];
  const slots = generateDaySlots({
    date,
    schedules: ctx.schedules,
    durationMinutes: ctx.durationMinutes,
    busy,
    now,
  });
  return {
    date,
    durationMinutes: ctx.durationMinutes,
    slots: slots.map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      available: s.available,
    })),
  };
}
