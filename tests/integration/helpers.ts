import { prisma } from '@/server/db';
import type { AuthContext } from '@/server/http/handler';
import { hashPassword, registerPatient } from '@/server/services/auth.service';
import { replaceSchedules } from '@/server/services/schedules.service';
import { createUser } from '@/server/services/users.service';

// Datos de apoyo para las pruebas de los módulos (especificacion/08 §3). Se crean con los
// mismos servicios que usa la API, sobre la base medicitas_test.

if (!(process.env.DATABASE_URL ?? '').includes('medicitas_test')) {
  throw new Error(
    'Las pruebas de módulos solo corren contra medicitas_test: use `npm run test:integration`.',
  );
}

export { prisma };

/** Lunes 1 de marzo de 2027, 07:00 en Bogotá: la "hora actual" de las pruebas. */
export const AHORA = new Date('2027-03-01T12:00:00.000Z');
/** Miércoles de esa semana, con jornada 08:00–12:00 (13:00–17:00 UTC). */
export const MIERCOLES = '2027-03-03';
export const CLAVE = 'Medicitas2026';

export async function limpiarBase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE notifications, appointments, doctor_schedules, doctors, patients, users, specialties RESTART IDENTITY CASCADE',
  );
}

export async function crearEspecialidad(nombre = 'Pediatría'): Promise<number> {
  const especialidad = await prisma.specialty.create({
    data: { name: nombre, description: nombre },
  });
  return especialidad.id;
}

export async function crearAdmin(): Promise<AuthContext> {
  const user = await prisma.user.create({
    data: {
      role: 'ADMIN',
      documentType: 'CC',
      documentNumber: '900000001',
      firstName: 'Admin',
      lastName: 'Pruebas',
      email: 'admin@pruebas.com',
      passwordHash: await hashPassword(CLAVE),
    },
  });
  return { userId: user.id, role: 'ADMIN', patientId: null, doctorId: null };
}

/** Registra un paciente por el mismo servicio que usa POST /auth/register. */
export async function crearPaciente(sufijo: string): Promise<AuthContext> {
  const user = await registerPatient({
    documentType: 'CC',
    documentNumber: `10${sufijo}`,
    firstName: 'Paciente',
    lastName: sufijo,
    email: `paciente${sufijo}@pruebas.com`,
    password: CLAVE,
    birthDate: '1995-04-17',
    gender: 'FEMALE',
  });
  const paciente = await prisma.patient.findUniqueOrThrow({ where: { userId: user.id } });
  return { userId: user.id, role: 'PATIENT', patientId: paciente.id, doctorId: null };
}

/** Crea un médico como lo hace el administrador y le asigna jornada de lunes a viernes 08:00–12:00. */
export async function crearMedico(sufijo: string, especialidadId: number): Promise<AuthContext> {
  const { user } = await createUser({
    role: 'DOCTOR',
    documentType: 'CC',
    documentNumber: `20${sufijo}`,
    firstName: 'Médico',
    lastName: sufijo,
    email: `medico${sufijo}@pruebas.com`,
    specialtyId: especialidadId,
    licenseNumber: `RM-${sufijo}`,
    appointmentDurationMinutes: 30,
  });
  const medico = await prisma.doctor.findUniqueOrThrow({ where: { userId: user.id } });
  const jornada = [1, 2, 3, 4, 5].map((weekday) => ({
    weekday,
    startTime: '08:00',
    endTime: '12:00',
  }));
  await replaceSchedules(medico.id, { schedules: jornada }, AHORA);
  return { userId: user.id, role: 'DOCTOR', patientId: null, doctorId: medico.id };
}

export const pagina = { page: 1, pageSize: 50 };
