import { MAX_ADVANCE_BOOKING_DAYS, MIN_BOOKING_LEAD_HOURS, MS_PER_MINUTE } from './constants';
import { addDays, addHours, combineClinicDateTime, getIsoWeekday } from './datetime';

// Núcleo del producto: generación de cupos (RN-13). Función pura, sin acceso a datos.

export interface ScheduleInput {
  weekday: number;
  startTime: string; // HH:mm, hora de la clínica
  endTime: string;
}

export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
}

export interface GenerateSlotsInput {
  date: string; // YYYY-MM-DD
  schedules: ScheduleInput[];
  durationMinutes: number;
  busy: BusyInterval[];
  now: Date;
}

/** Ventana de reserva: [ahora + 2 h, ahora + 60 días] (RN-14, RN-15). */
export function getBookingWindow(now: Date): { earliest: Date; latest: Date } {
  return {
    earliest: addHours(now, MIN_BOOKING_LEAD_HOURS),
    latest: addDays(now, MAX_ADVANCE_BOOKING_DAYS),
  };
}

/**
 * Amplía un intervalo ocupado `minutes` hacia cada lado. Sirve para exigir una
 * separación mínima entre las citas de un mismo paciente (RN-21.7): un cupo que
 * caiga dentro del intervalo ampliado queda demasiado cerca de la cita existente.
 */
export function padInterval(interval: BusyInterval, minutes: number): BusyInterval {
  const deltaMs = minutes * MS_PER_MINUTE;
  return {
    startsAt: new Date(interval.startsAt.getTime() - deltaMs),
    endsAt: new Date(interval.endsAt.getTime() + deltaMs),
  };
}

export function padIntervals(intervals: BusyInterval[], minutes: number): BusyInterval[] {
  return intervals.map((interval) => padInterval(interval, minutes));
}

function overlaps(a: BusyInterval, b: BusyInterval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/** Divide una franja en tramos que caben completos (RN-13.3, RN-13.4). */
function splitSchedule(date: string, schedule: ScheduleInput, durationMinutes: number): Slot[] {
  const durationMs = durationMinutes * MS_PER_MINUTE;
  const franjaStart = combineClinicDateTime(date, schedule.startTime);
  const franjaEnd = combineClinicDateTime(date, schedule.endTime);
  const slots: Slot[] = [];
  let cursor = franjaStart;
  while (cursor.getTime() + durationMs <= franjaEnd.getTime()) {
    const endsAt = new Date(cursor.getTime() + durationMs);
    slots.push({ startsAt: cursor, endsAt, available: true });
    cursor = endsAt;
  }
  return slots;
}

/**
 * Genera los cupos de un médico para una fecha (RN-13).
 * Los cupos fuera de la ventana de reserva no se incluyen; los ocupados sí, con
 * `available: false`, para que la interfaz pueda mostrarlos tachados.
 */
export function generateDaySlots(input: GenerateSlotsInput): Slot[] {
  const weekday = getIsoWeekday(input.date);
  const { earliest, latest } = getBookingWindow(input.now);
  const daySchedules = input.schedules.filter((s) => s.weekday === weekday);

  return daySchedules
    .flatMap((schedule) => splitSchedule(input.date, schedule, input.durationMinutes))
    .filter((slot) => slot.startsAt >= earliest && slot.startsAt <= latest)
    .map((slot) => ({
      ...slot,
      available: !input.busy.some((busy) => overlaps(slot, busy)),
    }))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Cupos de una jornada sin aplicar ventana ni ocupación. Lo usa la semilla de datos. */
export function generateScheduleSlots(
  date: string,
  schedules: ScheduleInput[],
  durationMinutes: number,
): Slot[] {
  const weekday = getIsoWeekday(date);
  return schedules
    .filter((s) => s.weekday === weekday)
    .flatMap((schedule) => splitSchedule(date, schedule, durationMinutes))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Cuenta los cupos disponibles de un día. */
export function countAvailableSlots(input: GenerateSlotsInput): number {
  return generateDaySlots(input).filter((slot) => slot.available).length;
}

/** Cupos totales por semana que ofrece una configuración (para la vista previa). */
export function countWeeklySlots(schedules: ScheduleInput[], durationMinutes: number): number {
  const reference = '2026-01-05'; // un lunes; solo importa el día de la semana
  return schedules.reduce((total, schedule) => {
    const date = addDaysToIso(reference, schedule.weekday - 1);
    return total + splitSchedule(date, schedule, durationMinutes).length;
  }, 0);
}

function addDaysToIso(dateString: string, days: number): string {
  const [year = 2026, month = 1, day = 1] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Dos franjas del mismo día no pueden solaparse (RN-12). */
export function findScheduleOverlap(
  schedules: ScheduleInput[],
): [ScheduleInput, ScheduleInput] | null {
  const sorted = [...schedules].sort(
    (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
  );
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev && curr && prev.weekday === curr.weekday && curr.startTime < prev.endTime) {
      return [prev, curr];
    }
  }
  return null;
}
