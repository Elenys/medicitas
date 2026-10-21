// Excepciones de dominio. Cada una lleva su código público y su estado HTTP
// (especificacion/04-api.md §1.3). El envoltorio de handlers las traduce.

export interface FieldIssue {
  field: string;
  message: string;
}

export class DomainError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: FieldIssue[];

  public constructor(init: {
    code: string;
    status: number;
    message: string;
    details?: FieldIssue[];
  }) {
    super(init.message);
    this.name = 'DomainError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
  }
}

const HTTP = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
} as const;

export class ValidationError extends DomainError {
  public constructor(details: FieldIssue[], message = 'Revise los datos ingresados.') {
    super({
      code: 'VALIDATION_ERROR',
      status: HTTP.BAD_REQUEST,
      message: message,
      details: details,
    });
  }
}

export class UnauthenticatedError extends DomainError {
  public constructor(message = 'Su sesión ha expirado. Inicie sesión nuevamente.') {
    super({ code: 'UNAUTHENTICATED', status: HTTP.UNAUTHORIZED, message: message });
  }
}

export class InvalidCredentialsError extends DomainError {
  public constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      status: HTTP.UNAUTHORIZED,
      message: 'Correo o contraseña incorrectos.',
    });
  }
}

export class ForbiddenError extends DomainError {
  public constructor(message = 'No tiene permiso para realizar esta acción.') {
    super({ code: 'FORBIDDEN', status: HTTP.FORBIDDEN, message: message });
  }
}

export class CancellationWindowClosedError extends DomainError {
  public constructor() {
    super({
      code: 'CANCELLATION_WINDOW_CLOSED',
      status: HTTP.FORBIDDEN,
      message:
        'Esta cita no se puede cancelar porque faltan menos de 24 horas. Comuníquese con la institución.',
    });
  }
}

export class NotFoundError extends DomainError {
  public constructor(message = 'El recurso solicitado no existe.') {
    super({ code: 'NOT_FOUND', status: HTTP.NOT_FOUND, message: message });
  }
}

export class EmailAlreadyExistsError extends DomainError {
  public constructor() {
    super({
      code: 'EMAIL_ALREADY_EXISTS',
      status: HTTP.CONFLICT,
      message: 'Ya existe una cuenta con ese correo.',
    });
  }
}

export class DocumentAlreadyExistsError extends DomainError {
  public constructor() {
    super({
      code: 'DOCUMENT_ALREADY_EXISTS',
      status: HTTP.CONFLICT,
      message: 'Ya existe una cuenta con ese número de documento.',
    });
  }
}

export class LicenseAlreadyExistsError extends DomainError {
  public constructor() {
    super({
      code: 'LICENSE_ALREADY_EXISTS',
      status: HTTP.CONFLICT,
      message: 'Ya existe un médico con esa licencia profesional.',
    });
  }
}

export class SlotTakenError extends DomainError {
  public constructor() {
    super({
      code: 'SLOT_TAKEN',
      status: HTTP.CONFLICT,
      message: 'Ese horario acaba de ser reservado por otra persona. Elija otra franja.',
    });
  }
}

export class PatientAppointmentTooCloseError extends DomainError {
  public constructor(gapMinutes: number) {
    super({
      code: 'PATIENT_APPOINTMENT_TOO_CLOSE',
      status: HTTP.CONFLICT,
      message: `Ya tiene otra cita a menos de ${gapMinutes} minutos de ese horario. Debe dejar al menos ${gapMinutes} minutos entre una cita y otra.`,
    });
  }
}

export class InvalidStateTransitionError extends DomainError {
  public constructor(message = 'La cita no admite esta acción en su estado actual.') {
    super({ code: 'INVALID_STATE_TRANSITION', status: HTTP.CONFLICT, message: message });
  }
}

export class ScheduleOverlapError extends DomainError {
  public constructor() {
    super({
      code: 'SCHEDULE_OVERLAP',
      status: HTTP.CONFLICT,
      message: 'Dos franjas del mismo día se solapan. Corríjalas.',
    });
  }
}
