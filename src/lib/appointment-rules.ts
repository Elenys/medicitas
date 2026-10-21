import { CANCELLATION_WINDOW_HOURS } from './constants';
import { addHours } from './datetime';

// Transiciones de estado y permisos de la cita (RN-18 a RN-26). Funciones puras.

export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface Viewer {
  userId: number;
  role: UserRole;
  patientId?: number | null;
  doctorId?: number | null;
}

export interface AppointmentLike {
  status: AppointmentStatus;
  startsAt: Date;
  patientId: number;
  doctorId: number;
}

export const TERMINAL_STATUSES: ReadonlyArray<AppointmentStatus> = ['COMPLETED', 'CANCELLED'];

const ACTIVE_STATUSES: ReadonlyArray<AppointmentStatus> = ['BOOKED', 'CONFIRMED'];

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActive(status: AppointmentStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isOwnerPatient(a: AppointmentLike, v: Viewer): boolean {
  return v.role === 'PATIENT' && v.patientId === a.patientId;
}

export function isAssignedDoctor(a: AppointmentLike, v: Viewer): boolean {
  return v.role === 'DOCTOR' && v.doctorId === a.doctorId;
}

/** RN-28 a RN-30: quién puede ver la cita. */
export function canView(a: AppointmentLike, v: Viewer): boolean {
  return v.role === 'ADMIN' || isOwnerPatient(a, v) || isAssignedDoctor(a, v);
}

/** RN-23: solo el paciente titular, en BOOKED, antes de la hora de inicio. */
export function canConfirm(a: AppointmentLike, v: Viewer, now: Date): boolean {
  return isOwnerPatient(a, v) && a.status === 'BOOKED' && a.startsAt > now;
}

/** RN-24: paciente con 24 h de margen; médico asignado y admin siempre, si no es terminal. */
export function canCancel(a: AppointmentLike, v: Viewer, now: Date): boolean {
  if (isTerminal(a.status)) return false;
  if (v.role === 'ADMIN' || isAssignedDoctor(a, v)) return true;
  if (!isOwnerPatient(a, v)) return false;
  return isCancellationWindowOpen(a.startsAt, now);
}

/** El límite de 24 h es estricto: a exactamente 24 h ya no se puede cancelar. */
export function isCancellationWindowOpen(startsAt: Date, now: Date): boolean {
  return startsAt > addHours(now, CANCELLATION_WINDOW_HOURS);
}

/** RN-25, RN-26: solo el médico asignado, en estado activo, con la hora de inicio ya pasada. */
export function canComplete(a: AppointmentLike, v: Viewer, now: Date): boolean {
  return isAssignedDoctor(a, v) && isActive(a.status) && a.startsAt <= now;
}

export interface AppointmentPermissions {
  canConfirm: boolean;
  canCancel: boolean;
  canComplete: boolean;
}

export function getPermissions(a: AppointmentLike, v: Viewer, now: Date): AppointmentPermissions {
  return {
    canConfirm: canConfirm(a, v, now),
    canCancel: canCancel(a, v, now),
    canComplete: canComplete(a, v, now),
  };
}
