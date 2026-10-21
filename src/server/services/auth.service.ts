import bcrypt from 'bcryptjs';
import { BCRYPT_ROUNDS } from '@/lib/constants';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@/lib/schemas';
import type { ProfileResponse, SessionUser } from '@/types/api';
import { prisma } from '../db';
import { InvalidCredentialsError, NotFoundError, ValidationError } from '../http/errors';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

const toSessionUser = (u: {
  id: number;
  role: SessionUser['role'];
  firstName: string;
  lastName: string;
  email: string;
}): SessionUser => ({
  id: u.id,
  role: u.role,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
});

/** CU-01: registro de paciente. La cuenta queda activa de inmediato. */
export async function registerPatient(input: RegisterInput): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      role: 'PATIENT',
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      patient: {
        create: {
          birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
          gender: input.gender,
          address: input.address ?? null,
          healthProvider: input.healthProvider ?? null,
        },
      },
    },
  });
  return toSessionUser(user);
}

/** CU-02. Nunca distingue correo inexistente, contraseña incorrecta ni cuenta inactiva. */
export async function login(input: LoginInput): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) throw new InvalidCredentialsError();
  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) throw new InvalidCredentialsError();
  return toSessionUser(user);
}

export async function getProfile(userId: number): Promise<ProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patient: true, doctor: { include: { specialty: true } } },
  });
  if (!user) throw new NotFoundError();
  return {
    ...toSessionUser(user),
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    phone: user.phone,
    isActive: user.isActive,
    patient: user.patient
      ? {
          id: user.patient.id,
          birthDate: user.patient.birthDate.toISOString().slice(0, 10),
          gender: user.patient.gender,
          address: user.patient.address,
          healthProvider: user.patient.healthProvider,
        }
      : null,
    doctor: user.doctor
      ? {
          id: user.doctor.id,
          specialty: { id: user.doctor.specialty.id, name: user.doctor.specialty.name },
          licenseNumber: user.doctor.licenseNumber,
          appointmentDurationMinutes: user.doctor.appointmentDurationMinutes,
        }
      : null,
  };
}

/** CU-04. Correo y documento no son editables; el esquema `strict` ya los rechaza. */
export async function updateProfile(
  userId: number,
  input: UpdateProfileInput,
): Promise<ProfileResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) throw new NotFoundError();
  const forbidden = collectFieldsNotAllowedForRole(user.role, input);
  if (forbidden.length > 0) throw new ValidationError(forbidden);

  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      ...(user.role === 'PATIENT' && {
        patient: { update: { address: input.address, healthProvider: input.healthProvider } },
      }),
      ...(user.role === 'DOCTOR' &&
        input.appointmentDurationMinutes !== undefined && {
          doctor: { update: { appointmentDurationMinutes: input.appointmentDurationMinutes } },
        }),
    },
  });
  return getProfile(userId);
}

function collectFieldsNotAllowedForRole(
  role: string,
  input: UpdateProfileInput,
): Array<{ field: string; message: string }> {
  const issues: Array<{ field: string; message: string }> = [];
  const onlyPatient = ['address', 'healthProvider'] as const;
  onlyPatient.forEach((field) => {
    if (input[field] !== undefined && role !== 'PATIENT')
      issues.push({ field, message: 'Campo no aplicable a su perfil' });
  });
  if (input.appointmentDurationMinutes !== undefined && role !== 'DOCTOR') {
    issues.push({ field: 'appointmentDurationMinutes', message: 'Campo no aplicable a su perfil' });
  }
  return issues;
}

/** CU-05. */
export async function changePassword(userId: number, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) throw new InvalidCredentialsError();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
