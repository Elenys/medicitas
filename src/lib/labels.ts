// Etiquetas de la interfaz en español para los valores enumerados del dominio.

export const STATUS_LABELS = {
  BOOKED: 'Reservada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
} as const;

export const ROLE_TITLES = {
  PATIENT: 'Paciente',
  DOCTOR: 'Médico',
  ADMIN: 'Administrador',
} as const;

export const DOCUMENT_TYPE_LABELS = {
  CC: 'Cédula de ciudadanía',
  TI: 'Tarjeta de identidad',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
} as const;

export const GENDER_LABELS = {
  FEMALE: 'Femenino',
  MALE: 'Masculino',
  OTHER: 'Otro',
} as const;

export const UI_TEXT = {
  sessionExpired: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  networkError: 'No fue posible conectar con el servidor. Reintente en unos minutos.',
  noUpcoming: 'No tiene citas próximas.',
  noAppointmentsToday: 'No tiene citas para este día.',
  noNotifications: 'No tiene avisos.',
  bookingSuccess: 'Su cita quedó reservada.',
  confirmSuccess: 'Su asistencia fue confirmada.',
  cancelSuccess: 'La cita fue cancelada.',
  completeSuccess: 'La atención fue registrada.',
  cancellationClosed:
    'Esta cita no se puede cancelar porque faltan menos de 24 horas. Comuníquese con la institución.',
  notStartedYet: 'Podrá registrar la atención cuando llegue la hora de la cita.',
} as const;
