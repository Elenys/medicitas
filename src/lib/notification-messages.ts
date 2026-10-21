import { formatDate, formatTime } from './datetime';

// Textos de las notificaciones (RN-32). Los usa el servicio y también la semilla.

interface AppointmentContext {
  startsAt: Date;
  doctorName: string;
  patientName: string;
}

const fecha = (c: AppointmentContext): string =>
  `${formatDate(c.startsAt)} a las ${formatTime(c.startsAt)}`;

export const notificationMessages = {
  bookedForPatient: (c: AppointmentContext): string =>
    `Su cita con Dr(a). ${c.doctorName} quedó reservada para el ${fecha(c)}.`,
  bookedForDoctor: (c: AppointmentContext): string =>
    `${c.patientName} reservó una cita para el ${fecha(c)}.`,
  confirmedForDoctor: (c: AppointmentContext): string =>
    `${c.patientName} confirmó su cita del ${fecha(c)}.`,
  cancelled: (c: AppointmentContext, reason: string): string =>
    `Su cita del ${fecha(c)} fue cancelada. Motivo: ${reason}.`,
  completedForPatient: (c: AppointmentContext): string =>
    `Su cita del ${formatDate(c.startsAt)} con Dr(a). ${c.doctorName} fue registrada como atendida.`,
  accountCreated: (roleLabel: string): string =>
    `Su cuenta de ${roleLabel} fue creada. Cambie su contraseña al ingresar.`,
};

export const ROLE_LABELS: Record<'PATIENT' | 'DOCTOR' | 'ADMIN', string> = {
  PATIENT: 'paciente',
  DOCTOR: 'médico',
  ADMIN: 'administrador',
};
