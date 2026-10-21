import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// Las restricciones del motor son la garantía del sistema (RN-22). Estas pruebas
// demuestran que están activas — especificacion/03 §7 y 08 §3.1.

const DB_URL = 'postgresql://medicitas:medicitas@localhost:5432/medicitas_test?schema=public';
const url = process.env.DATABASE_URL ?? DB_URL;
// Estas pruebas vacían las tablas: nunca deben tocar otra base que la de pruebas.
if (!url.includes('medicitas_test')) {
  throw new Error(
    `Las pruebas de integración solo corren contra medicitas_test (recibido: ${url}). ` +
      'Use `npm run test:integration`.',
  );
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

const T0 = new Date('2027-03-01T13:00:00.000Z'); // 08:00 Bogotá
const minutes = (m: number): Date => new Date(T0.getTime() + m * 60_000);
const ids = { specialty: 0, patientA: 0, patientB: 0, doctorA: 0, doctorB: 0, user: 0 };

async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE notifications, appointments, doctor_schedules, doctors, patients, users, specialties RESTART IDENTITY CASCADE',
  );
}

async function createPatient(suffix: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      role: 'PATIENT',
      documentType: 'CC',
      documentNumber: `1${suffix}`,
      firstName: 'Paciente',
      lastName: suffix,
      email: `paciente${suffix}@test.com`,
      passwordHash: 'x',
      patient: { create: { birthDate: new Date('1990-01-01T00:00:00Z'), gender: 'OTHER' } },
    },
    include: { patient: true },
  });
  ids.user = user.id;
  return user.patient?.id ?? 0;
}

async function createDoctor(suffix: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      role: 'DOCTOR',
      documentType: 'CC',
      documentNumber: `2${suffix}`,
      firstName: 'Doctor',
      lastName: suffix,
      email: `doctor${suffix}@test.com`,
      passwordHash: 'x',
      doctor: { create: { specialtyId: ids.specialty, licenseNumber: `RM-${suffix}` } },
    },
    include: { doctor: true },
  });
  return user.doctor?.id ?? 0;
}

const book = (
  patientId: number,
  doctorId: number,
  from: number,
  to: number,
  status: 'BOOKED' | 'CANCELLED' = 'BOOKED',
) =>
  prisma.appointment.create({
    data: {
      patientId,
      doctorId,
      startsAt: minutes(from),
      endsAt: minutes(to),
      status,
      cancellationReason: status === 'CANCELLED' ? 'prueba' : null,
    },
  });

beforeAll(async () => {
  await resetDatabase();
  ids.specialty = (await prisma.specialty.create({ data: { name: 'Prueba' } })).id;
  ids.patientA = await createPatient('001');
  ids.patientB = await createPatient('002');
  ids.doctorA = await createDoctor('001');
  ids.doctorB = await createDoctor('002');
});

beforeEach(async () => {
  await prisma.appointment.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('restricciones de appointments (RN-22)', () => {
  it('4. rechaza dos citas del mismo médico a la misma hora', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientB, ids.doctorA, 0, 30)).rejects.toThrow(/no_overlap|23P01/);
  });

  it('5. rechaza el solapamiento parcial 08:00–08:30 vs 08:15–08:45 (el modelo original lo permitía)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientB, ids.doctorA, 15, 45)).rejects.toThrow(/no_overlap|23P01/);
  });

  it('6. acepta citas consecutivas 08:00–08:30 y 08:30–09:00', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientB, ids.doctorA, 30, 60)).resolves.toBeDefined();
  });

  it('7. permite reutilizar un cupo cuya cita anterior fue cancelada (el modelo original lo bloqueaba)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30, 'CANCELLED');
    await expect(book(ids.patientB, ids.doctorA, 0, 30)).resolves.toBeDefined();
  });

  it('8. rechaza dos citas simultáneas del mismo paciente con médicos distintos', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientA, ids.doctorB, 0, 30)).rejects.toThrow(/min_gap|23P01/);
  });

  it('8.1. rechaza dos citas del mismo paciente a 30 min de distancia, con médicos distintos (RN-21.7)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientA, ids.doctorB, 60, 90)).rejects.toThrow(/min_gap|23P01/);
  });

  it('8.2. rechaza dos citas del mismo paciente separadas por 59 minutos (RN-21.7)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientA, ids.doctorB, 89, 119)).rejects.toThrow(/min_gap|23P01/);
  });

  it('8.3. acepta dos citas del mismo paciente separadas por exactamente 60 minutos (RN-21.7)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientA, ids.doctorB, 90, 120)).resolves.toBeDefined();
  });

  it('8.4. el margen no aplica entre pacientes distintos', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(book(ids.patientB, ids.doctorA, 30, 60)).resolves.toBeDefined();
  });

  it('8.5. una cita cancelada no reserva el margen (RN-21.7)', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30, 'CANCELLED');
    await expect(book(ids.patientA, ids.doctorB, 30, 60)).resolves.toBeDefined();
  });

  it('9. rechaza una cita que termina antes de empezar', async () => {
    await expect(book(ids.patientA, ids.doctorA, 30, 0)).rejects.toThrow(/time_range|23514/);
  });

  it('10. rechaza cancelar sin motivo', async () => {
    await expect(
      prisma.appointment.create({
        data: {
          patientId: ids.patientA,
          doctorId: ids.doctorA,
          startsAt: minutes(0),
          endsAt: minutes(30),
          status: 'CANCELLED',
        },
      }),
    ).rejects.toThrow(/cancellation_consistency|23514/);
  });

  it('15. no se borra un paciente que tiene citas', async () => {
    await book(ids.patientA, ids.doctorA, 0, 30);
    await expect(prisma.patient.delete({ where: { id: ids.patientA } })).rejects.toThrow();
  });
});

describe('concurrencia: dos pacientes reservan el mismo cupo a la vez', () => {
  it('exactamente uno gana', async () => {
    const results = await Promise.allSettled([
      book(ids.patientA, ids.doctorA, 0, 30),
      book(ids.patientB, ids.doctorA, 0, 30),
    ]);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    expect(succeeded).toHaveLength(1);
    expect(await prisma.appointment.count()).toBe(1);
  });
});
