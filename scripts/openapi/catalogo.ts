// Catálogo de los 30 endpoints de la API (especificacion/04-api.md §2).
// Cada entrada enlaza el endpoint con los esquemas Zod que usa su route handler, de modo que
// la especificación OpenAPI se genera a partir de las mismas reglas que valida la API.

import { z, type ZodType } from 'zod';
import {
  availabilityQuerySchema,
  availableSlotsQuerySchema,
  cancelAppointmentSchema,
  changePasswordSchema,
  completeAppointmentSchema,
  createAppointmentSchema,
  createUserSchema,
  listAppointmentsSchema,
  listDoctorsSchema,
  listUsersSchema,
  loginSchema,
  paginationSchema,
  registerSchema,
  reportRangeSchema,
  updateDoctorSchema,
  updateProfileSchema,
  updateSchedulesSchema,
  updateUserSchema,
} from '../../src/lib/schemas';

export type Permiso = 'PUBLICO' | 'AUTH' | 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface Endpoint {
  n: number;
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH';
  ruta: string;
  grupo: string;
  resumen: string;
  descripcion: string;
  permiso: Permiso;
  /** Además del rol, el recurso debe pertenecer a quien lo pide. */
  propietario?: boolean;
  cuerpo?: ZodType;
  consulta?: ZodType;
  /** Código de la respuesta exitosa. */
  exito: 200 | 201 | 204;
  /** Errores propios del endpoint (los generales 400/401/403 se agregan solos). */
  errores?: Partial<Record<400 | 401 | 403 | 404 | 409, string[]>>;
}

// Mismo esquema que declara src/app/api/v1/notifications/route.ts.
const notificationsQuerySchema = paginationSchema.extend({
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const GRUPOS: Record<string, string> = {
  Autenticación:
    'Registro de pacientes, inicio y cierre de sesión. La sesión es un JWT en la cookie httpOnly `medicitas_session`.',
  Perfil: 'Datos y contraseña del usuario de la sesión.',
  'Catálogos y disponibilidad': 'Especialidades, médicos y cupos libres para agendar.',
  'Horarios del médico':
    'Franjas semanales de atención y duración de la consulta del médico de la sesión.',
  Citas: 'Agendar, consultar, confirmar, cancelar y atender citas. El alcance depende del rol.',
  'Administración de usuarios': 'Gestión de médicos y administradores (solo administrador).',
  Notificaciones: 'Avisos internos del usuario de la sesión.',
  'Panel y reportes': 'Indicadores del panel según el rol y reporte de citas por especialidad.',
};

export const ENDPOINTS: Endpoint[] = [
  // ───────────────────────────── Autenticación
  {
    n: 1,
    metodo: 'POST',
    ruta: '/api/v1/auth/register',
    grupo: 'Autenticación',
    permiso: 'PUBLICO',
    exito: 201,
    resumen: 'Registrar paciente',
    cuerpo: registerSchema,
    descripcion:
      'Crea el usuario con rol PATIENT y su registro de paciente en una sola transacción, emite la cookie de sesión y devuelve el usuario (CU-01). La contraseña cumple RN-04: mínimo 8 caracteres con minúscula, mayúscula y dígito.',
    errores: { 409: ['EMAIL_ALREADY_EXISTS', 'DOCUMENT_ALREADY_EXISTS'] },
  },
  {
    n: 2,
    metodo: 'POST',
    ruta: '/api/v1/auth/login',
    grupo: 'Autenticación',
    permiso: 'PUBLICO',
    exito: 200,
    resumen: 'Iniciar sesión',
    cuerpo: loginSchema,
    descripcion:
      'Verifica correo y contraseña, emite la cookie de sesión y devuelve el usuario (CU-02). El error no distingue si el correo no existe, si la contraseña es incorrecta o si la cuenta está desactivada.',
    errores: { 401: ['INVALID_CREDENTIALS'] },
  },
  {
    n: 3,
    metodo: 'POST',
    ruta: '/api/v1/auth/logout',
    grupo: 'Autenticación',
    permiso: 'PUBLICO',
    exito: 204,
    resumen: 'Cerrar sesión',
    descripcion: 'Borra la cookie de sesión (CU-03). No falla si no había sesión.',
  },
  {
    n: 4,
    metodo: 'GET',
    ruta: '/api/v1/auth/me',
    grupo: 'Autenticación',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Usuario de la sesión',
    descripcion:
      'Devuelve el usuario de la sesión con su perfil de paciente o de médico según el rol.',
  },

  // ───────────────────────────── Perfil
  {
    n: 5,
    metodo: 'GET',
    ruta: '/api/v1/profile',
    grupo: 'Perfil',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Consultar perfil',
    descripcion:
      'Datos completos del usuario autenticado, con su perfil de paciente o de médico (CU-04).',
  },
  {
    n: 6,
    metodo: 'PATCH',
    ruta: '/api/v1/profile',
    grupo: 'Perfil',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Editar perfil',
    cuerpo: updateProfileSchema,
    descripcion:
      'Todos pueden editar firstName, lastName y phone; el paciente además address y healthProvider; el médico además appointmentDurationMinutes. El correo y el documento no son editables: enviarlos produce 400.',
  },
  {
    n: 7,
    metodo: 'PATCH',
    ruta: '/api/v1/profile/password',
    grupo: 'Perfil',
    permiso: 'AUTH',
    exito: 204,
    resumen: 'Cambiar contraseña',
    cuerpo: changePasswordSchema,
    descripcion:
      'Cambia la contraseña del usuario de la sesión (CU-05). La nueva cumple RN-04 y debe ser distinta de la actual.',
    errores: { 401: ['INVALID_CREDENTIALS'] },
  },

  // ───────────────────────────── Catálogos y disponibilidad
  {
    n: 8,
    metodo: 'GET',
    ruta: '/api/v1/specialties',
    grupo: 'Catálogos y disponibilidad',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Listar especialidades',
    descripcion: 'Catálogo completo de especialidades, ordenado por nombre y sin paginar (CU-06).',
  },
  {
    n: 9,
    metodo: 'GET',
    ruta: '/api/v1/doctors',
    grupo: 'Catálogos y disponibilidad',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Listar médicos',
    consulta: listDoctorsSchema,
    descripcion:
      'Médicos activos con al menos una franja configurada (RN-16), con la primera fecha que tiene cupo libre. Filtro opcional por especialidad. Respuesta paginada (CU-07).',
  },
  {
    n: 10,
    metodo: 'GET',
    ruta: '/api/v1/doctors/{id}',
    grupo: 'Catálogos y disponibilidad',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Detalle de médico',
    descripcion: 'Datos del médico con sus franjas de atención (CU-07).',
    errores: { 404: ['NOT_FOUND'] },
  },
  {
    n: 11,
    metodo: 'GET',
    ruta: '/api/v1/doctors/{id}/availability',
    grupo: 'Catálogos y disponibilidad',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Disponibilidad del mes',
    consulta: availabilityQuerySchema,
    descripcion:
      'Cupos libres por día del mes indicado, dentro de la ventana de RN-14 y RN-15. Alimenta el calendario del asistente para agendar (CU-08).',
    errores: { 404: ['NOT_FOUND'] },
  },
  {
    n: 12,
    metodo: 'GET',
    ruta: '/api/v1/doctors/{id}/available-slots',
    grupo: 'Catálogos y disponibilidad',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Cupos de un día',
    consulta: availableSlotsQuerySchema,
    descripcion:
      'Todos los cupos de la jornada del médico en la fecha indicada, marcando cuáles están libres (CU-09).',
    errores: { 404: ['NOT_FOUND'] },
  },

  // ───────────────────────────── Horarios del médico
  {
    n: 13,
    metodo: 'GET',
    ruta: '/api/v1/doctors/me/schedules',
    grupo: 'Horarios del médico',
    permiso: 'DOCTOR',
    exito: 200,
    resumen: 'Consultar mis franjas',
    descripcion:
      'Franjas semanales y duración de la consulta del médico de la sesión (CU-15). weekday: 1 = lunes … 7 = domingo.',
  },
  {
    n: 14,
    metodo: 'PUT',
    ruta: '/api/v1/doctors/me/schedules',
    grupo: 'Horarios del médico',
    permiso: 'DOCTOR',
    exito: 200,
    resumen: 'Reemplazar mis franjas',
    cuerpo: updateSchedulesSchema,
    descripcion:
      'Reemplaza el conjunto completo de franjas (RN-11: fin posterior al inicio; RN-12: sin solapamientos). Si hay citas futuras que quedan fuera de la nueva jornada se devuelve una advertencia; esas citas no se cancelan ni se mueven (RN-17).',
    errores: { 409: ['SCHEDULE_OVERLAP'] },
  },
  {
    n: 15,
    metodo: 'PATCH',
    ruta: '/api/v1/doctors/me',
    grupo: 'Horarios del médico',
    permiso: 'DOCTOR',
    exito: 200,
    resumen: 'Cambiar duración de la consulta',
    cuerpo: updateDoctorSchema,
    descripcion:
      'Duración entre 10 y 120 minutos (RN-09). No altera las citas ya agendadas; solo los cupos que se generen desde ese momento.',
  },

  // ───────────────────────────── Citas
  {
    n: 16,
    metodo: 'GET',
    ruta: '/api/v1/appointments',
    grupo: 'Citas',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Listar citas',
    consulta: listAppointmentsSchema,
    descripcion:
      'El paciente ve solo sus citas, el médico solo las suyas y el administrador todas (RN-28 a RN-30). Cada cita trae canConfirm, canCancel y canComplete calculados por el servidor. doctorId y patientId solo los usa el administrador. Respuesta paginada (CU-13, CU-16, CU-24).',
  },
  {
    n: 17,
    metodo: 'POST',
    ruta: '/api/v1/appointments',
    grupo: 'Citas',
    permiso: 'PATIENT',
    exito: 201,
    resumen: 'Agendar cita',
    cuerpo: createAppointmentSchema,
    descripcion:
      'El paciente se toma de la sesión y la hora de fin la calcula el servidor con la duración del médico (RN-20, RN-21.4). startsAt debe ser el inicio de un cupo libre (CU-10).',
    errores: { 404: ['NOT_FOUND'], 409: ['SLOT_TAKEN', 'PATIENT_APPOINTMENT_TOO_CLOSE'] },
  },
  {
    n: 18,
    metodo: 'GET',
    ruta: '/api/v1/appointments/{id}',
    grupo: 'Citas',
    permiso: 'AUTH',
    propietario: true,
    exito: 200,
    resumen: 'Detalle de cita',
    descripcion:
      'El paciente ve los datos del médico; el médico además los del paciente (RN-29); el administrador todo salvo las observaciones clínicas (RN-30) (CU-14).',
    errores: { 404: ['NOT_FOUND'] },
  },
  {
    n: 19,
    metodo: 'PATCH',
    ruta: '/api/v1/appointments/{id}/confirm',
    grupo: 'Citas',
    permiso: 'PATIENT',
    propietario: true,
    exito: 200,
    resumen: 'Confirmar cita',
    descripcion: 'El paciente titular confirma su asistencia. Sin cuerpo (CU-11).',
    errores: { 404: ['NOT_FOUND'], 409: ['INVALID_STATE_TRANSITION'] },
  },
  {
    n: 20,
    metodo: 'PATCH',
    ruta: '/api/v1/appointments/{id}/cancel',
    grupo: 'Citas',
    permiso: 'AUTH',
    propietario: true,
    exito: 200,
    resumen: 'Cancelar cita',
    cuerpo: cancelAppointmentSchema,
    descripcion:
      'Pueden cancelar el paciente titular (con más de 24 h de anticipación), el médico asignado o un administrador. Guarda el motivo y notifica a la contraparte (RN-24, RN-32.1) (CU-12).',
    errores: {
      403: ['CANCELLATION_WINDOW_CLOSED'],
      404: ['NOT_FOUND'],
      409: ['INVALID_STATE_TRANSITION'],
    },
  },
  {
    n: 21,
    metodo: 'PATCH',
    ruta: '/api/v1/appointments/{id}/complete',
    grupo: 'Citas',
    permiso: 'DOCTOR',
    propietario: true,
    exito: 200,
    resumen: 'Registrar atención',
    cuerpo: completeAppointmentSchema,
    descripcion:
      'El médico asignado marca la cita como atendida, con observaciones opcionales. Solo si la hora de inicio ya pasó (RN-26) (CU-17).',
    errores: { 404: ['NOT_FOUND'], 409: ['INVALID_STATE_TRANSITION'] },
  },

  // ───────────────────────────── Administración de usuarios
  {
    n: 22,
    metodo: 'GET',
    ruta: '/api/v1/users',
    grupo: 'Administración de usuarios',
    permiso: 'ADMIN',
    exito: 200,
    resumen: 'Listar usuarios',
    consulta: listUsersSchema,
    descripcion:
      'Búsqueda por nombre, apellido, correo o documento (q) y filtros por rol y estado. Nunca devuelve el hash de la contraseña (RN-31). Respuesta paginada (CU-20).',
  },
  {
    n: 23,
    metodo: 'POST',
    ruta: '/api/v1/users',
    grupo: 'Administración de usuarios',
    permiso: 'ADMIN',
    exito: 201,
    resumen: 'Crear médico o administrador',
    cuerpo: createUserSchema,
    descripcion:
      'Los pacientes se registran solos (RN-08). Para DOCTOR son obligatorios specialtyId, licenseNumber y appointmentDurationMinutes. Devuelve, una sola vez, la contraseña temporal generada (RN-08.1) (CU-21).',
    errores: { 409: ['EMAIL_ALREADY_EXISTS', 'DOCUMENT_ALREADY_EXISTS', 'LICENSE_ALREADY_EXISTS'] },
  },
  {
    n: 24,
    metodo: 'PATCH',
    ruta: '/api/v1/users/{id}',
    grupo: 'Administración de usuarios',
    permiso: 'ADMIN',
    exito: 200,
    resumen: 'Editar o desactivar usuario',
    cuerpo: updateUserSchema,
    descripcion:
      'Edita isActive, nombre, apellido y teléfono; para médicos también especialidad y duración. El administrador no puede desactivarse a sí mismo (RN-08.4). No existe borrado de usuarios (RN-08.3) (CU-22).',
    errores: { 404: ['NOT_FOUND'] },
  },
  {
    n: 25,
    metodo: 'POST',
    ruta: '/api/v1/users/{id}/reset-password',
    grupo: 'Administración de usuarios',
    permiso: 'ADMIN',
    exito: 200,
    resumen: 'Restablecer contraseña',
    descripcion:
      'Genera una contraseña temporal, la guarda cifrada y la devuelve una sola vez. Sin cuerpo (CU-23).',
    errores: { 404: ['NOT_FOUND'] },
  },

  // ───────────────────────────── Notificaciones
  {
    n: 26,
    metodo: 'GET',
    ruta: '/api/v1/notifications',
    grupo: 'Notificaciones',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Listar notificaciones',
    consulta: notificationsQuerySchema,
    descripcion:
      'Notificaciones del usuario de la sesión, de la más reciente a la más antigua, con el total sin leer (unreadCount) para la campana. Respuesta paginada (CU-25).',
  },
  {
    n: 27,
    metodo: 'PATCH',
    ruta: '/api/v1/notifications/{id}/read',
    grupo: 'Notificaciones',
    permiso: 'AUTH',
    propietario: true,
    exito: 204,
    resumen: 'Marcar notificación como leída',
    descripcion: 'Sin cuerpo. Solo sobre notificaciones propias (CU-25).',
    errores: { 404: ['NOT_FOUND'] },
  },
  {
    n: 28,
    metodo: 'PATCH',
    ruta: '/api/v1/notifications/read-all',
    grupo: 'Notificaciones',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Marcar todas como leídas',
    descripcion: 'Devuelve cuántas notificaciones se actualizaron (CU-25).',
  },

  // ───────────────────────────── Panel y reportes
  {
    n: 29,
    metodo: 'GET',
    ruta: '/api/v1/dashboard',
    grupo: 'Panel y reportes',
    permiso: 'AUTH',
    exito: 200,
    resumen: 'Indicadores del panel',
    descripcion:
      'Un solo endpoint que responde según el rol: próxima cita y conteos para el paciente, agenda del día para el médico e indicadores generales para el administrador (RN-36) (CU-18).',
  },
  {
    n: 30,
    metodo: 'GET',
    ruta: '/api/v1/reports/appointments-by-specialty',
    grupo: 'Panel y reportes',
    permiso: 'ADMIN',
    exito: 200,
    resumen: 'Citas por especialidad',
    consulta: reportRangeSchema,
    descripcion:
      'Cuenta las citas no canceladas cuyo inicio cae en el rango, agrupadas por especialidad (RN-37). Por omisión, los últimos 30 días (CU-19).',
  },
];
