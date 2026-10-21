import type { Prisma } from '@prisma/client';
import { generateDaySlots, padInterval, type Slot } from '@/lib/availability';
import {
  canCancel,
  canComplete,
  canConfirm,
  canView,
  getPermissions,
  isCancellationWindowOpen,
  isOwnerPatient,
  isTerminal,
  type Viewer,
} from '@/lib/appointment-rules';
import { PATIENT_APPOINTMENT_GAP_MINUTES } from '@/lib/constants';
import { getClinicDayBounds, toClinicDateString } from '@/lib/datetime';
import { notificationMessages } from '@/lib/notification-messages';
import type { CreateAppointmentInput, ListAppointmentsQuery } from '@/lib/schemas';
import { fullName } from '@/lib/utils';
import type { AppointmentDto, Paginated } from '@/types/api';
import { prisma } from '../db';
import type { AuthContext } from '../http/handler';
import {
  CancellationWindowClosedError,
  ForbiddenError,
  InvalidStateTransitionError,
  NotFoundError,
  PatientAppointmentTooCloseError,
  SlotTakenError,
  ValidationError,
} from '../http/errors';
import {
  getBusyIntervals,
  requireBookableDoctor,
  type DoctorContext,
} from './availability.service';
import { createNotifications, type NewNotification } from './notifications.service';

export const appointmentInclude = {
  patient: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          documentType: true,
          documentNumber: true,
        },
      },
    },
  },
  doctor: {
    include: { user: { select: { id: true, firstName: true, lastName: true } }, specialty: true },
  },
  cancelledBy: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export const toViewer = (auth: AuthContext): Viewer => ({
  userId: auth.userId,
  role: auth.role,
  patientId: auth.patientId,
  doctorId: auth.doctorId,
});

/** Serializa según quién mira (RN-29: el médico ve datos del paciente; RN-30: el admin no ve notas). */
export function serializeAppointment(
  row: AppointmentRow,
  viewer: Viewer,
  now: Date,
): AppointmentDto {
  const seesPatientDetail = viewer.role === 'DOCTOR';
  const seesNotes = viewer.role !== 'ADMIN';
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    reason: row.reason,
    ...(seesNotes && { notes: row.notes }),
    cancellationReason: row.cancellationReason,
    cancelledBy: row.cancelledBy
      ? { id: row.cancelledBy.id, fullName: fullName(row.cancelledBy), role: row.cancelledBy.role }
      : null,
    createdAt: row.createdAt.toISOString(),
    patient: {
      id: row.patient.id,
      fullName: fullName(row.patient.user),
      ...(seesPatientDetail && {
        documentType: row.patient.user.documentType,
        documentNumber: row.patient.user.documentNumber,
        phone: row.patient.user.phone,
        birthDate: row.patient.birthDate.toISOString().slice(0, 10),
        gender: row.patient.gender,
      }),
    },
    doctor: {
      id: row.doctor.id,
      fullName: fullName(row.doctor.user),
      specialty: row.doctor.specialty.name,
      appointmentDurationMinutes: row.doctor.appointmentDurationMinutes,
    },
    ...getPermissions(row, viewer, now),
  };
}

/** El rol fija el alcance; dentro de él, el cliente puede acotar por la contraparte. */
function scopeWhere(auth: AuthContext, query: ListAppointmentsQuery): Prisma.AppointmentWhereInput {
  if (auth.role === 'PATIENT') return { patientId: auth.patientId ?? -1, doctorId: query.doctorId };
  if (auth.role === 'DOCTOR') return { doctorId: auth.doctorId ?? -1, patientId: query.patientId };
  return { doctorId: query.doctorId, patientId: query.patientId };
}

function filtersWhere(query: ListAppointmentsQuery, now: Date): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = { status: query.status };
  if (query.scope === 'upcoming')
    Object.assign(where, { status: { in: ['BOOKED', 'CONFIRMED'] }, startsAt: { gte: now } });
  if (query.scope === 'history')
    Object.assign(where, {
      OR: [{ status: { in: ['COMPLETED', 'CANCELLED'] } }, { startsAt: { lt: now } }],
    });
  if (query.date) {
    const bounds = getClinicDayBounds(query.date);
    Object.assign(where, { startsAt: { gte: bounds.start, lt: bounds.end } });
    if (!query.includeCancelled && !query.status) where.status = { not: 'CANCELLED' };
  }
  if (query.from || query.to) {
    where.startsAt = {
      ...(query.from && { gte: getClinicDayBounds(query.from).start }),
      ...(query.to && { lt: getClinicDayBounds(query.to).end }),
    };
  }
  return where;
}

/** CU-13, CU-16, CU-24. El alcance lo fija el rol, no el cliente (RN-28 a RN-30). */
export async function listAppointments(
  auth: AuthContext,
  query: ListAppointmentsQuery,
  now: Date,
): Promise<Paginated<AppointmentDto>> {
  const where: Prisma.AppointmentWhereInput = {
    AND: [scopeWhere(auth, query), filtersWhere(query, now)],
  };
  const ascending = query.scope === 'upcoming' || Boolean(query.date) || Boolean(query.from);
  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startsAt: ascending ? 'asc' : 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.appointment.count({ where }),
  ]);
  const viewer = toViewer(auth);
  return {
    items: rows.map((row) => serializeAppointment(row, viewer, now)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

async function loadAppointment(id: number, auth: AuthContext): Promise<AppointmentRow> {
  const row = await prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
  if (!row) throw new NotFoundError('La cita no existe.');
  if (!canView(row, toViewer(auth))) throw new ForbiddenError();
  return row;
}

/** CU-14. */
export async function getAppointment(
  auth: AuthContext,
  id: number,
  now: Date,
): Promise<AppointmentDto> {
  return serializeAppointment(await loadAppointment(id, auth), toViewer(auth), now);
}

/** Localiza el cupo que empieza exactamente en `startsAt` (RN-21.2, RN-21.5). */
async function resolveSlot(doctor: DoctorContext, startsAt: Date, now: Date): Promise<Slot> {
  const date = toClinicDateString(startsAt);
  const bounds = getClinicDayBounds(date);
  const busy = await getBusyIntervals(doctor.id, bounds.start, bounds.end);
  const slots = generateDaySlots({
    date,
    schedules: doctor.schedules,
    durationMinutes: doctor.durationMinutes,
    busy,
    now,
  });
  const slot = slots.find((s) => s.startsAt.getTime() === startsAt.getTime());
  if (!slot) {
    throw new ValidationError([
      { field: 'startsAt', message: 'La hora no corresponde a un cupo válido' },
    ]);
  }
  if (!slot.available) throw new SlotTakenError();
  return slot;
}

/**
 * El paciente no puede tener otra cita activa solapada (RN-21.6) ni a menos de
 * `PATIENT_APPOINTMENT_GAP_MINUTES` de distancia (RN-21.7). Se compara contra el
 * cupo ampliado por ese margen, así que también se rechazan las citas pegadas
 * con médicos distintos.
 */
async function ensurePatientIsFree(patientId: number, slot: Slot): Promise<void> {
  const window = padInterval(slot, PATIENT_APPOINTMENT_GAP_MINUTES);
  const clash = await prisma.appointment.count({
    where: {
      patientId,
      status: { not: 'CANCELLED' },
      startsAt: { lt: window.endsAt },
      endsAt: { gt: window.startsAt },
    },
  });
  if (clash > 0) throw new PatientAppointmentTooCloseError(PATIENT_APPOINTMENT_GAP_MINUTES);
}

/** Crea la cita y sus dos avisos en una sola transacción (RN-32.1). */
async function persistBooking(booking: {
  patientId: number;
  doctor: DoctorContext;
  slot: Slot;
  reason?: string;
}): Promise<AppointmentRow> {
  const { patientId, doctor, slot, reason } = booking;
  return prisma.$transaction(async (tx) => {
    const row = await tx.appointment.create({
      data: {
        patientId,
        doctorId: doctor.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        reason: reason ?? null,
      },
      include: appointmentInclude,
    });
    const ctx = {
      startsAt: row.startsAt,
      doctorName: doctor.fullName,
      patientName: fullName(row.patient.user),
    };
    await createNotifications(tx, [
      {
        userId: row.patient.user.id,
        appointmentId: row.id,
        type: 'APPOINTMENT_BOOKED',
        message: notificationMessages.bookedForPatient(ctx),
      },
      {
        userId: row.doctor.user.id,
        appointmentId: row.id,
        type: 'APPOINTMENT_BOOKED',
        message: notificationMessages.bookedForDoctor(ctx),
      },
    ]);
    return row;
  });
}

/** CU-10 (RN-20, RN-21, RN-22). */
export async function createAppointment(
  auth: AuthContext,
  input: CreateAppointmentInput,
  now: Date,
): Promise<AppointmentDto> {
  if (auth.role !== 'PATIENT' || !auth.patientId) {
    throw new ForbiddenError('Solo un paciente puede reservar citas.');
  }
  const doctor = await requireBookableDoctor(input.doctorId);
  const slot = await resolveSlot(doctor, new Date(input.startsAt), now);
  await ensurePatientIsFree(auth.patientId, slot);
  const created = await persistBooking({
    patientId: auth.patientId,
    doctor,
    slot,
    reason: input.reason,
  });
  return serializeAppointment(created, toViewer(auth), now);
}

const contextOf = (
  row: AppointmentRow,
): { startsAt: Date; doctorName: string; patientName: string } => ({
  startsAt: row.startsAt,
  doctorName: fullName(row.doctor.user),
  patientName: fullName(row.patient.user),
});

/** CU-11 (RN-23). */
export async function confirmAppointment(
  auth: AuthContext,
  id: number,
  now: Date,
): Promise<AppointmentDto> {
  const row = await loadAppointment(id, auth);
  const viewer = toViewer(auth);
  if (!isOwnerPatient(row, viewer))
    throw new ForbiddenError('Solo el paciente titular puede confirmar la cita.');
  if (!canConfirm(row, viewer, now))
    throw new InvalidStateTransitionError(
      'Solo se confirma una cita reservada cuya hora aún no ha pasado.',
    );
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: appointmentInclude,
    });
    await createNotifications(tx, [
      {
        userId: row.doctor.user.id,
        appointmentId: id,
        type: 'APPOINTMENT_CONFIRMED',
        message: notificationMessages.confirmedForDoctor(contextOf(row)),
      },
    ]);
    return result;
  });
  return serializeAppointment(updated, viewer, now);
}

function cancellationRecipients(row: AppointmentRow, viewer: Viewer): number[] {
  if (viewer.role === 'PATIENT') return [row.doctor.user.id];
  if (viewer.role === 'DOCTOR') return [row.patient.user.id];
  return [row.patient.user.id, row.doctor.user.id];
}

/** CU-12 (RN-24). */
export async function cancelAppointment(
  auth: AuthContext,
  input: { id: number; reason: string },
  now: Date,
): Promise<AppointmentDto> {
  const { id, reason } = input;
  const row = await loadAppointment(id, auth);
  const viewer = toViewer(auth);
  if (isTerminal(row.status))
    throw new InvalidStateTransitionError('La cita ya está completada o cancelada.');
  if (isOwnerPatient(row, viewer) && !isCancellationWindowOpen(row.startsAt, now))
    throw new CancellationWindowClosedError();
  if (!canCancel(row, viewer, now)) throw new ForbiddenError();

  const message = notificationMessages.cancelled(contextOf(row), reason);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancellationReason: reason, cancelledByUserId: auth.userId },
      include: appointmentInclude,
    });
    const items: NewNotification[] = cancellationRecipients(row, viewer).map((userId) => ({
      userId,
      appointmentId: id,
      type: 'APPOINTMENT_CANCELLED',
      message,
    }));
    await createNotifications(tx, items);
    return result;
  });
  return serializeAppointment(updated, viewer, now);
}

/** CU-17 (RN-25 a RN-27). */
export async function completeAppointment(
  auth: AuthContext,
  input: { id: number; notes?: string },
  now: Date,
): Promise<AppointmentDto> {
  const { id, notes } = input;
  const row = await loadAppointment(id, auth);
  const viewer = toViewer(auth);
  if (viewer.role !== 'DOCTOR' || viewer.doctorId !== row.doctorId)
    throw new ForbiddenError('Solo el médico asignado puede registrar la atención.');
  if (!canComplete(row, viewer, now))
    throw new InvalidStateTransitionError(
      'Solo se completa una cita activa cuya hora de inicio ya pasó.',
    );
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.appointment.update({
      where: { id },
      data: { status: 'COMPLETED', notes: notes ?? null },
      include: appointmentInclude,
    });
    await createNotifications(tx, [
      {
        userId: row.patient.user.id,
        appointmentId: id,
        type: 'APPOINTMENT_COMPLETED',
        message: notificationMessages.completedForPatient(contextOf(row)),
      },
    ]);
    return result;
  });
  return serializeAppointment(updated, viewer, now);
}
