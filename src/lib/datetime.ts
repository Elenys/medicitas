import { es } from 'date-fns/locale';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { CLINIC_TIMEZONE, MS_PER_DAY, MS_PER_HOUR } from './constants';

// Todo formato de fecha pasa por aquí (especificacion/06 §8). Ningún componente
// formatea fechas por su cuenta. Almacenamiento en UTC, presentación en Bogotá (RN-01).

const SUNDAY_JS = 0;
const ISO_SUNDAY = 7;

/** Fecha `YYYY-MM-DD` del instante dado, en zona de la clínica. */
export function toClinicDateString(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, 'yyyy-MM-dd');
}

/** Hora `HH:mm` del instante dado, en zona de la clínica. */
export function toClinicTimeString(date: Date): string {
  return formatInTimeZone(date, CLINIC_TIMEZONE, 'HH:mm');
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha `YYYY-MM-DD` (RN-03). */
export function getIsoWeekday(dateString: string): number {
  const noon = fromZonedTime(`${dateString}T12:00:00`, CLINIC_TIMEZONE);
  const jsDay = toZonedTime(noon, CLINIC_TIMEZONE).getDay();
  return jsDay === SUNDAY_JS ? ISO_SUNDAY : jsDay;
}

/** Instante UTC de `YYYY-MM-DD` + `HH:mm` interpretados como hora de Bogotá. */
export function combineClinicDateTime(dateString: string, time: string): Date {
  return fromZonedTime(`${dateString}T${time}:00`, CLINIC_TIMEZONE);
}

/** Inicio y fin (exclusivo) de un día de la clínica, en UTC. */
export function getClinicDayBounds(dateString: string): { start: Date; end: Date } {
  const start = combineClinicDateTime(dateString, '00:00');
  return { start, end: new Date(start.getTime() + MS_PER_DAY) };
}

/** Suma días a una fecha `YYYY-MM-DD` de la clínica y devuelve otra `YYYY-MM-DD`. */
export function addClinicDays(dateString: string, days: number): string {
  const noon = combineClinicDateTime(dateString, '12:00');
  return toClinicDateString(new Date(noon.getTime() + days * MS_PER_DAY));
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Convierte un `TIME` de Prisma (Date en 1970-01-01 UTC) a `HH:mm`. */
export function prismaTimeToString(time: Date): string {
  const hours = String(time.getUTCHours()).padStart(2, '0');
  const minutes = String(time.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Convierte `HH:mm` al Date que Prisma espera para una columna `TIME`. */
export function stringToPrismaTime(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

/** Minutos desde medianoche de una hora `HH:mm`. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// --- Formatos de presentación (locale es, zona Bogotá) ---

function fmt(date: Date | string, pattern: string): string {
  return formatInTimeZone(new Date(date), CLINIC_TIMEZONE, pattern, { locale: es });
}

export const formatDate = (d: Date | string): string => fmt(d, "d 'de' MMMM 'de' yyyy");
export const formatShortDate = (d: Date | string): string => fmt(d, 'dd/MM/yyyy');
export const formatWeekdayDate = (d: Date | string): string => fmt(d, "EEEE, d 'de' MMMM");
export const formatTime = (d: Date | string): string => fmt(d, 'h:mm aaaa');
export const formatDateTime = (d: Date | string): string => fmt(d, "d 'de' MMMM, h:mm aaaa");
export const formatTimeRange = (a: Date | string, b: Date | string): string =>
  `${formatTime(a)} – ${formatTime(b)}`;
export const formatMonthTitle = (d: Date | string): string => fmt(d, 'MMMM yyyy');
