import { REPORT_DEFAULT_RANGE_DAYS } from '@/lib/constants';
import {
  addClinicDays,
  getClinicDayBounds,
  getIsoWeekday,
  toClinicDateString,
} from '@/lib/datetime';
import type { AppointmentDto, DashboardResponse, SpecialtyReportResponse } from '@/types/api';
import { prisma } from '../db';
import type { AuthContext } from '../http/handler';
import { appointmentInclude, serializeAppointment, toViewer } from './appointments.service';

const DAYS_PER_WEEK = 7;

async function nextAppointmentFor(
  auth: AuthContext,
  where: { patientId?: number; doctorId?: number },
  now: Date,
): Promise<AppointmentDto | null> {
  const row = await prisma.appointment.findFirst({
    where: { ...where, status: { in: ['BOOKED', 'CONFIRMED'] }, startsAt: { gte: now } },
    include: appointmentInclude,
    orderBy: { startsAt: 'asc' },
  });
  return row ? serializeAppointment(row, toViewer(auth), now) : null;
}

async function patientDashboard(auth: AuthContext, now: Date): Promise<DashboardResponse> {
  const patientId = auth.patientId ?? -1;
  const [nextAppointment, upcomingCount, completedCount] = await Promise.all([
    nextAppointmentFor(auth, { patientId }, now),
    prisma.appointment.count({
      where: { patientId, status: { in: ['BOOKED', 'CONFIRMED'] }, startsAt: { gte: now } },
    }),
    prisma.appointment.count({ where: { patientId, status: 'COMPLETED' } }),
  ]);
  return { role: 'PATIENT', nextAppointment, upcomingCount, completedCount };
}

async function doctorDashboard(auth: AuthContext, now: Date): Promise<DashboardResponse> {
  const doctorId = auth.doctorId ?? -1;
  const today = getClinicDayBounds(toClinicDateString(now));
  const [todayCount, pendingConfirmationCount, completedTodayCount, nextAppointment] =
    await Promise.all([
      prisma.appointment.count({
        where: {
          doctorId,
          status: { not: 'CANCELLED' },
          startsAt: { gte: today.start, lt: today.end },
        },
      }),
      prisma.appointment.count({ where: { doctorId, status: 'BOOKED', startsAt: { gte: now } } }),
      prisma.appointment.count({
        where: { doctorId, status: 'COMPLETED', startsAt: { gte: today.start, lt: today.end } },
      }),
      nextAppointmentFor(auth, { doctorId }, now),
    ]);
  return {
    role: 'DOCTOR',
    todayCount,
    pendingConfirmationCount,
    completedTodayCount,
    nextAppointment,
  };
}

/** RN-36, siempre en zona de la clínica. */
async function adminDashboard(now: Date): Promise<DashboardResponse> {
  const todayString = toClinicDateString(now);
  const today = getClinicDayBounds(todayString);
  const monday = addClinicDays(todayString, 1 - getIsoWeekday(todayString));
  const week = {
    start: getClinicDayBounds(monday).start,
    end: getClinicDayBounds(addClinicDays(monday, DAYS_PER_WEEK)).start,
  };
  const monthStart = getClinicDayBounds(`${todayString.slice(0, 7)}-01`).start;
  const [appointmentsToday, appointmentsThisWeek, cancelledThisMonth, registeredPatients] =
    await Promise.all([
      prisma.appointment.count({
        where: { status: { not: 'CANCELLED' }, startsAt: { gte: today.start, lt: today.end } },
      }),
      prisma.appointment.count({
        where: { status: { not: 'CANCELLED' }, startsAt: { gte: week.start, lt: week.end } },
      }),
      prisma.appointment.count({ where: { status: 'CANCELLED', updatedAt: { gte: monthStart } } }),
      prisma.user.count({ where: { role: 'PATIENT', isActive: true } }),
    ]);
  return {
    role: 'ADMIN',
    appointmentsToday,
    appointmentsThisWeek,
    cancelledThisMonth,
    registeredPatients,
  };
}

/** Endpoint 29: un solo punto que responde según el rol. */
export async function getDashboard(auth: AuthContext, now: Date): Promise<DashboardResponse> {
  if (auth.role === 'PATIENT') return patientDashboard(auth, now);
  if (auth.role === 'DOCTOR') return doctorDashboard(auth, now);
  return adminDashboard(now);
}

/** Endpoint 30 (RN-37): citas no canceladas por especialidad en el rango. */
export async function getAppointmentsBySpecialty(
  range: { from?: string; to?: string },
  now: Date,
): Promise<SpecialtyReportResponse> {
  const to = range.to ?? toClinicDateString(now);
  const from = range.from ?? addClinicDays(to, -REPORT_DEFAULT_RANGE_DAYS);
  const start = getClinicDayBounds(from).start;
  const end = getClinicDayBounds(to).end;
  const rows = await prisma.$queryRaw<Array<{ id: number; name: string; total: number }>>`
    SELECT s.id, s.name, COUNT(a.id)::int AS total
    FROM specialties s
    LEFT JOIN doctors d ON d.specialty_id = s.id
    LEFT JOIN appointments a
      ON a.doctor_id = d.id AND a.status <> 'CANCELLED'
     AND a.starts_at >= ${start} AND a.starts_at < ${end}
    GROUP BY s.id, s.name
    ORDER BY total DESC, s.name ASC`;
  return {
    from,
    to,
    items: rows.map((r) => ({ specialtyId: r.id, specialtyName: r.name, total: r.total })),
  };
}
