// Constantes del sistema — especificacion/02-reglas-de-negocio.md §1.
// Ningún valor de este archivo puede aparecer incrustado en la lógica.

export const CLINIC_TIMEZONE = 'America/Bogota';

export const MIN_BOOKING_LEAD_HOURS = 2; // RN-14
export const MAX_ADVANCE_BOOKING_DAYS = 60; // RN-15
export const CANCELLATION_WINDOW_HOURS = 24; // RN-24
export const PATIENT_APPOINTMENT_GAP_MINUTES = 60; // RN-21.7

export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30; // RN-09
export const MIN_APPOINTMENT_DURATION_MINUTES = 10;
export const MAX_APPOINTMENT_DURATION_MINUTES = 120;

export const MIN_PASSWORD_LENGTH = 8; // RN-04
export const BCRYPT_ROUNDS = 10; // RN-05
export const SESSION_DURATION_HOURS = 8; // RN-06
export const SESSION_COOKIE_NAME = 'medicitas_session';

export const DEFAULT_PAGE_SIZE = 10; // RN-33
export const MAX_PAGE_SIZE = 50;

export const MAX_NOTES_LENGTH = 2000; // RN-27
export const MAX_REASON_LENGTH = 255;
export const MIN_CANCELLATION_REASON_LENGTH = 3; // RN-24.1

export const REPORT_DEFAULT_RANGE_DAYS = 30; // RN-37

export const MINUTES_PER_HOUR = 60;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** Días de la semana según ISO-8601 (RN-03). */
export const WEEKDAYS: ReadonlyArray<{ value: number; label: string; short: string }> = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 7, label: 'Domingo', short: 'Dom' },
];
