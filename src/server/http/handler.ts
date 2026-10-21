import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import type { UserRole } from '@/lib/appointment-rules';
import { PATIENT_APPOINTMENT_GAP_MINUTES } from '@/lib/constants';
import { prisma } from '../db';
import { readSessionFromCookies, type SessionPayload } from '../session';
import {
  DocumentAlreadyExistsError,
  DomainError,
  EmailAlreadyExistsError,
  ForbiddenError,
  LicenseAlreadyExistsError,
  PatientAppointmentTooCloseError,
  SlotTakenError,
  UnauthenticatedError,
  ValidationError,
} from './errors';

// Envoltorio único de los route handlers (especificacion/04 §11). Ningún handler
// contiene try/catch propio: aquí se traducen todas las excepciones al catálogo.

export interface AuthContext extends SessionPayload {
  patientId: number | null;
  doctorId: number | null;
}

type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (request: Request, context: RouteContext) => Promise<Response>;

const HTTP_INTERNAL = 500;

function errorResponse(error: DomainError): Response {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status },
  );
}

function translateUnique(error: Prisma.PrismaClientKnownRequestError): DomainError {
  const target = String(error.meta?.['target'] ?? '');
  if (target.includes('email')) return new EmailAlreadyExistsError();
  if (target.includes('document')) return new DocumentAlreadyExistsError();
  if (target.includes('license')) return new LicenseAlreadyExistsError();
  return new DomainError({ code: 'CONFLICT', status: 409, message: 'El registro ya existe.' });
}

function translate(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError(details);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return translateUnique(error);
  }
  // Las restricciones EXCLUDE llegan como error 23P01 del motor (RN-22).
  const text = error instanceof Error ? error.message : '';
  if (text.includes('patient_min_gap')) {
    return new PatientAppointmentTooCloseError(PATIENT_APPOINTMENT_GAP_MINUTES);
  }
  if (text.includes('no_overlap') || text.includes('23P01')) return new SlotTakenError();

  console.error('[api] error no controlado', error);
  return new DomainError({
    code: 'INTERNAL_ERROR',
    status: HTTP_INTERNAL,
    message: 'Ocurrió un error inesperado. Reintente en unos minutos.',
  });
}

export function withHandler(handler: Handler): Handler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(translate(error));
    }
  };
}

/** Resuelve la sesión y verifica que la cuenta siga activa (RN-08.2). */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthContext> {
  const session = await readSessionFromCookies();
  if (!session) throw new UnauthenticatedError();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      isActive: true,
      role: true,
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
    },
  });
  if (!user || !user.isActive) {
    throw new UnauthenticatedError(
      'Su cuenta se encuentra inactiva. Comuníquese con el administrador.',
    );
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new ForbiddenError();

  return {
    userId: session.userId,
    role: user.role,
    patientId: user.patient?.id ?? null,
    doctorId: user.doctor?.id ?? null,
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw: unknown = await request.json().catch(() => ({}));
  return schema.parse(raw);
}

export function parseQuery<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

export async function parseId(context: RouteContext, key = 'id'): Promise<number> {
  const value = Number((await context.params)[key]);
  if (!Number.isInteger(value) || value <= 0)
    throw new ValidationError([{ field: key, message: 'Identificador inválido' }]);
  return value;
}

export const json = <T>(data: T, status = 200): Response => NextResponse.json(data, { status });
export const noContent = (): Response => new Response(null, { status: 204 });
