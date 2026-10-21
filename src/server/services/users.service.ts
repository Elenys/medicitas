import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ROLE_LABELS, notificationMessages } from '@/lib/notification-messages';
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from '@/lib/schemas';
import type { Paginated, UserDto } from '@/types/api';
import { prisma } from '../db';
import { ForbiddenError, NotFoundError } from '../http/errors';
import { hashPassword } from './auth.service';
import { createNotifications } from './notifications.service';

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const TEMP_PASSWORD_LENGTH = 6;

const pick = (alphabet: string): string => alphabet[randomInt(alphabet.length)] ?? 'a';

/** Contraseña temporal que cumple RN-04: al menos una minúscula, una mayúscula y un dígito. */
export function generateTemporaryPassword(): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  const all = LOWER + UPPER + DIGITS;
  while (required.length < TEMP_PASSWORD_LENGTH) required.push(pick(all));
  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [required[i], required[j]] = [required[j] ?? '', required[i] ?? ''];
  }
  return `Med-${required.join('')}`;
}

const userInclude = {
  doctor: { include: { specialty: true, _count: { select: { schedules: true } } } },
} satisfies Prisma.UserInclude;

type UserRow = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function serialize(u: UserRow): UserDto {
  return {
    id: u.id,
    role: u.role,
    documentType: u.documentType,
    documentNumber: u.documentNumber,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    doctor: u.doctor
      ? {
          id: u.doctor.id,
          specialty: { id: u.doctor.specialty.id, name: u.doctor.specialty.name },
          licenseNumber: u.doctor.licenseNumber,
          appointmentDurationMinutes: u.doctor.appointmentDurationMinutes,
          scheduleCount: u.doctor._count.schedules,
        }
      : null,
  };
}

/** CU-20. */
export async function listUsers(query: ListUsersQuery): Promise<Paginated<UserDto>> {
  const where: Prisma.UserWhereInput = {
    role: query.role,
    isActive: query.isActive,
    ...(query.q && {
      OR: [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { documentNumber: { contains: query.q } },
      ],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: rows.map(serialize),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** CU-21: crea médico o administrador y devuelve la contraseña temporal una sola vez (RN-08.1). */
export async function createUser(
  input: CreateUserInput,
): Promise<{ user: UserDto; temporaryPassword: string }> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role: input.role,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        passwordHash,
        ...(input.role === 'DOCTOR' && {
          doctor: {
            create: {
              specialtyId: input.specialtyId,
              licenseNumber: input.licenseNumber,
              appointmentDurationMinutes: input.appointmentDurationMinutes,
            },
          },
        }),
      },
      include: userInclude,
    });
    await createNotifications(tx, [
      {
        userId: user.id,
        type: 'ACCOUNT_CREATED',
        message: notificationMessages.accountCreated(ROLE_LABELS[input.role]),
      },
    ]);
    return user;
  });

  return { user: serialize(created), temporaryPassword };
}

/** CU-22. No existe borrado (RN-08.3); un admin no se desactiva a sí mismo (RN-08.4). */
export async function updateUser(
  actorId: number,
  targetId: number,
  input: UpdateUserInput,
): Promise<UserDto> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, include: userInclude });
  if (!target) throw new NotFoundError('El usuario no existe.');
  if (input.isActive === false && actorId === targetId) {
    throw new ForbiddenError('No puede desactivar su propia cuenta.');
  }
  const doctorData =
    target.doctor &&
    (input.specialtyId !== undefined || input.appointmentDurationMinutes !== undefined)
      ? {
          doctor: {
            update: {
              specialtyId: input.specialtyId,
              appointmentDurationMinutes: input.appointmentDurationMinutes,
            },
          },
        }
      : {};
  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      isActive: input.isActive,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      ...doctorData,
    },
    include: userInclude,
  });
  return serialize(updated);
}

/** CU-23. */
export async function resetPassword(targetId: number): Promise<string> {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw new NotFoundError('El usuario no existe.');
  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: targetId },
    data: { passwordHash: await hashPassword(temporaryPassword) },
  });
  return temporaryPassword;
}
