// Datos de demostración (especificacion/08 §4). Idempotente: si ya hay usuarios no hace
// nada, salvo que se ejecute con SEED_FORCE=1, en cuyo caso reinicia todo.
// Las fechas son relativas al día de ejecución para que la demo funcione cualquier día.

import { PrismaClient, type AppointmentStatus, type Gender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  generateScheduleSlots,
  padInterval,
  type BusyInterval,
  type ScheduleInput,
  type Slot,
} from '../src/lib/availability';
import { BCRYPT_ROUNDS, MS_PER_HOUR, PATIENT_APPOINTMENT_GAP_MINUTES } from '../src/lib/constants';
import { addClinicDays, stringToPrismaTime, toClinicDateString } from '../src/lib/datetime';
import { ROLE_LABELS, notificationMessages } from '../src/lib/notification-messages';

const prisma = new PrismaClient();
const PASSWORD = 'Medicitas2026';
const PRINCIPAL_PATIENT = 'paciente@correo.com';

// ---------------------------------------------------------------- catálogo
const specialties = [
  { name: 'Medicina General', description: 'Atención primaria y valoración inicial' },
  { name: 'Pediatría', description: 'Atención de niños y adolescentes' },
  { name: 'Ginecología', description: 'Salud femenina y reproductiva' },
  { name: 'Cardiología', description: 'Enfermedades del corazón y sistema circulatorio' },
  { name: 'Dermatología', description: 'Enfermedades de la piel' },
];

interface DoctorSeed {
  email: string;
  firstName: string;
  lastName: string;
  document: string;
  specialty: string;
  license: string;
  duration: number;
  schedules: ScheduleInput[];
}
const franjas = (days: number[], ...ranges: Array<[string, string]>): ScheduleInput[] =>
  days.flatMap((weekday) =>
    ranges.map(([startTime, endTime]) => ({ weekday, startTime, endTime })),
  );

const doctors: DoctorSeed[] = [
  {
    email: 'laura.medina@medicitas.com',
    firstName: 'Laura',
    lastName: 'Medina',
    document: '52411789',
    specialty: 'Medicina General',
    license: 'RM-10231',
    duration: 30,
    schedules: franjas([1, 2, 3, 4, 5], ['07:00', '12:00'], ['14:00', '18:00']),
  },
  {
    email: 'andres.ramirez@medicitas.com',
    firstName: 'Andrés',
    lastName: 'Ramírez',
    document: '79456123',
    specialty: 'Pediatría',
    license: 'RM-45871',
    duration: 20,
    schedules: franjas([1, 3, 5], ['08:00', '12:00']),
  },
  // 240 min ÷ 50 no divide exacto: 4 cupos y 40 minutos descartados (RN-13.4).
  {
    email: 'carolina.vega@medicitas.com',
    firstName: 'Carolina',
    lastName: 'Vega',
    document: '43987654',
    specialty: 'Ginecología',
    license: 'RM-33920',
    duration: 50,
    schedules: franjas([2, 4], ['09:00', '13:00']),
  },
  {
    email: 'jorge.salazar@medicitas.com',
    firstName: 'Jorge',
    lastName: 'Salazar',
    document: '80123456',
    specialty: 'Cardiología',
    license: 'RM-27615',
    duration: 30,
    schedules: franjas([1, 2, 3, 4], ['14:00', '18:00']),
  },
  {
    email: 'marta.ruiz@medicitas.com',
    firstName: 'Marta',
    lastName: 'Ruiz',
    document: '39876543',
    specialty: 'Dermatología',
    license: 'RM-51004',
    duration: 15,
    schedules: franjas([1, 2, 3, 4, 5, 6], ['08:00', '11:30']),
  },
  {
    email: 'pedro.cano@medicitas.com',
    firstName: 'Pedro',
    lastName: 'Cano',
    document: '71234567',
    specialty: 'Medicina General',
    license: 'RM-60877',
    duration: 30,
    schedules: [],
  }, // sin horarios (RN-16)
];

interface PatientSeed {
  email: string;
  firstName: string;
  lastName: string;
  document: string;
  birthDate: string;
  gender: Gender;
  phone?: string;
  address?: string;
  eps?: string;
  isActive?: boolean;
}
const patients: PatientSeed[] = [
  {
    email: PRINCIPAL_PATIENT,
    firstName: 'Sofía',
    lastName: 'Herrera',
    document: '1098765432',
    birthDate: '1995-04-17',
    gender: 'FEMALE',
    phone: '3001234567',
    address: 'Carrera 15 # 93-60',
    eps: 'Nueva EPS',
  },
  {
    email: 'laura.gomez@correo.com',
    firstName: 'Laura',
    lastName: 'Gómez',
    document: '1012345678',
    birthDate: '1988-11-02',
    gender: 'FEMALE',
    phone: '3159876543',
    eps: 'Sura',
  },
  {
    email: 'carlos.perez@correo.com',
    firstName: 'Carlos',
    lastName: 'Pérez',
    document: '1023456789',
    birthDate: '1979-06-23',
    gender: 'MALE',
    phone: '3204567890',
    eps: 'Sanitas',
  },
  {
    email: 'ana.rodriguez@correo.com',
    firstName: 'Ana',
    lastName: 'Rodríguez',
    document: '1034567890',
    birthDate: '2001-01-15',
    gender: 'FEMALE',
    phone: '3012223344',
  },
  {
    email: 'diego.martinez@correo.com',
    firstName: 'Diego',
    lastName: 'Martínez',
    document: '1045678901',
    birthDate: '1965-09-30',
    gender: 'MALE',
    phone: '3187654321',
    eps: 'Compensar',
  },
  {
    email: 'valentina.lopez@correo.com',
    firstName: 'Valentina',
    lastName: 'López',
    document: '1056789012',
    birthDate: '2010-03-08',
    gender: 'FEMALE',
    phone: '3112233445',
    eps: 'Famisanar',
  },
  {
    email: 'mateo.garcia@correo.com',
    firstName: 'Mateo',
    lastName: 'García',
    document: '1067890123',
    birthDate: '2014-12-01',
    gender: 'MALE',
    phone: '3123344556',
    eps: 'Salud Total',
  },
  {
    email: 'camila.torres@correo.com',
    firstName: 'Camila',
    lastName: 'Torres',
    document: '1078901234',
    birthDate: '1992-07-19',
    gender: 'FEMALE',
    phone: '3134455667',
  },
  {
    email: 'samuel.ospina@correo.com',
    firstName: 'Samuel',
    lastName: 'Ospina',
    document: '1089012345',
    birthDate: '1958-02-27',
    gender: 'MALE',
    phone: '3145566778',
    eps: 'Nueva EPS',
  },
  {
    email: 'alex.rios@correo.com',
    firstName: 'Alex',
    lastName: 'Ríos',
    document: '1090123456',
    birthDate: '1999-10-10',
    gender: 'OTHER',
    phone: '3156677889',
  },
  {
    email: 'inactivo@correo.com',
    firstName: 'Diego',
    lastName: 'Torres',
    document: '1001112223',
    birthDate: '1985-05-05',
    gender: 'MALE',
    isActive: false,
  }, // cuenta desactivada (RN-08.2)
];

const admins = [
  {
    email: 'admin@medicitas.com',
    firstName: 'Carlas',
    lastName: 'Montalvo',
    document: '1000000001',
  },
  {
    email: 'soporte@medicitas.com',
    firstName: 'Freyder',
    lastName: 'López',
    document: '1000000002',
  },
];

// ---------------------------------------------------------------- utilidades
interface DoctorRef {
  id: number;
  userId: number;
  name: string;
  schedules: ScheduleInput[];
  duration: number;
}
interface PatientRef {
  id: number;
  userId: number;
  name: string;
}
interface Booking {
  patient: PatientRef;
  doctor: DoctorRef;
  slot: Slot;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledByUserId?: number;
}

const now = new Date();
const today = toClinicDateString(now);
const usedByDoctor = new Map<number, Slot[]>();
const usedByPatient = new Map<number, Slot[]>();
const overlaps = (a: BusyInterval, b: BusyInterval): boolean =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt;
const isFree = (map: Map<number, Slot[]>, key: number, slot: Slot): boolean =>
  !(map.get(key) ?? []).some((s) => overlaps(s, slot));
/** El paciente además necesita el margen de RN-21.7 entre una cita y otra. */
const isPatientFree = (patientId: number, slot: Slot): boolean =>
  !(usedByPatient.get(patientId) ?? []).some((s) =>
    overlaps(padInterval(s, PATIENT_APPOINTMENT_GAP_MINUTES), slot),
  );

/** Primer cupo libre del médico y del paciente en el día dado; busca hasta 6 días en la misma dirección. */
function takeSlot(
  doctor: DoctorRef,
  patient: PatientRef,
  dayOffset: number,
  filter?: (s: Slot) => boolean,
): Slot | null {
  const direction = dayOffset < 0 ? -1 : 1;
  for (let step = 0; step < 7; step += 1) {
    const date = addClinicDays(today, dayOffset + step * direction);
    const slots = generateScheduleSlots(date, doctor.schedules, doctor.duration);
    const slot = slots.find(
      (s) =>
        (filter ? filter(s) : true) &&
        isFree(usedByDoctor, doctor.id, s) &&
        isPatientFree(patient.id, s),
    );
    if (slot) {
      usedByDoctor.set(doctor.id, [...(usedByDoctor.get(doctor.id) ?? []), slot]);
      usedByPatient.set(patient.id, [...(usedByPatient.get(patient.id) ?? []), slot]);
      return slot;
    }
  }
  return null;
}

const REASONS = [
  'Control de rutina',
  'Dolor de cabeza recurrente',
  'Revisión de exámenes',
  'Chequeo anual',
  'Molestias digestivas',
  'Consulta de seguimiento',
  'Vacunación',
  'Dolor en el pecho al caminar',
  'Erupción en la piel',
  'Control prenatal',
];
const NOTES = [
  'Paciente estable. Se indica control en tres meses.',
  'Se formula tratamiento por 7 días y reposo.',
  'Exámenes dentro de parámetros normales. Continuar hábitos saludables.',
  'Se remite a especialista para valoración complementaria.',
  'Evolución favorable. Alta con recomendaciones.',
];
const CANCEL_REASONS = [
  'Surgió un imprevisto laboral',
  'Inasistencia del paciente',
  'Enfermedad del profesional',
  'El paciente ya fue atendido por urgencias',
  'Viaje fuera de la ciudad',
  'Reprogramación solicitada por el paciente',
];
const pickCycle = <T>(list: T[], i: number): T => list[i % list.length] as T;

// ---------------------------------------------------------------- ejecución
async function reset(): Promise<void> {
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.specialty.deleteMany();
}

async function seedUsers(
  passwordHash: string,
): Promise<{ doctorRefs: DoctorRef[]; patientRefs: PatientRef[]; adminIds: number[] }> {
  const specialtyIds = new Map<string, number>();
  for (const s of specialties) {
    const row = await prisma.specialty.create({ data: s });
    specialtyIds.set(s.name, row.id);
  }
  const adminIds: number[] = [];
  for (const a of admins) {
    const row = await prisma.user.create({
      data: {
        role: 'ADMIN',
        documentType: 'CC',
        documentNumber: a.document,
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        passwordHash,
      },
    });
    adminIds.push(row.id);
  }
  const doctorRefs: DoctorRef[] = [];
  for (const d of doctors) {
    const row = await prisma.user.create({
      data: {
        role: 'DOCTOR',
        documentType: 'CC',
        documentNumber: d.document,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: '3100000000',
        passwordHash,
        doctor: {
          create: {
            specialtyId: specialtyIds.get(d.specialty) ?? 1,
            licenseNumber: d.license,
            appointmentDurationMinutes: d.duration,
            schedules: {
              create: d.schedules.map((s) => ({
                weekday: s.weekday,
                startTime: stringToPrismaTime(s.startTime),
                endTime: stringToPrismaTime(s.endTime),
              })),
            },
          },
        },
      },
      include: { doctor: true },
    });
    doctorRefs.push({
      id: row.doctor?.id ?? 0,
      userId: row.id,
      name: `${d.firstName} ${d.lastName}`,
      schedules: d.schedules,
      duration: d.duration,
    });
  }
  const patientRefs: PatientRef[] = [];
  for (const p of patients) {
    const row = await prisma.user.create({
      data: {
        role: 'PATIENT',
        documentType: 'CC',
        documentNumber: p.document,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone ?? null,
        passwordHash,
        isActive: p.isActive ?? true,
        patient: {
          create: {
            birthDate: new Date(`${p.birthDate}T00:00:00.000Z`),
            gender: p.gender,
            address: p.address ?? null,
            healthProvider: p.eps ?? null,
          },
        },
      },
      include: { patient: true },
    });
    if (p.isActive !== false)
      patientRefs.push({
        id: row.patient?.id ?? 0,
        userId: row.id,
        name: `${p.firstName} ${p.lastName}`,
      });
  }
  return { doctorRefs, patientRefs, adminIds };
}

function planBookings(
  doctorRefs: DoctorRef[],
  patientRefs: PatientRef[],
  adminIds: number[],
): Booking[] {
  const active = doctorRefs.filter((d) => d.schedules.length > 0);
  const principal = patientRefs[0] as PatientRef;
  const others = patientRefs.slice(1);
  const laura = active[0] as DoctorRef;
  const bookings: Booking[] = [];
  const push = (b: Omit<Booking, 'slot'> & { slot: Slot | null }): void => {
    if (b.slot) bookings.push(b as Booking);
  };

  // Paciente principal: reservada mañana, confirmada la semana entrante, 5 completadas.
  push({
    patient: principal,
    doctor: active[1] as DoctorRef,
    slot: takeSlot(active[1] as DoctorRef, principal, 1),
    status: 'BOOKED',
    reason: 'Control de rutina',
  });
  push({
    patient: principal,
    doctor: active[3] as DoctorRef,
    slot: takeSlot(active[3] as DoctorRef, principal, 7),
    status: 'CONFIRMED',
    reason: 'Dolor en el pecho al caminar',
  });
  for (let i = 0; i < 5; i += 1) {
    const doctor = pickCycle(active, i);
    push({
      patient: principal,
      doctor,
      slot: takeSlot(doctor, principal, -4 - i * 5),
      status: 'COMPLETED',
      reason: pickCycle(REASONS, i),
      notes: pickCycle(NOTES, i),
    });
  }
  // Dentro de las próximas 24 h (no cancelable por el paciente, RN-24.4): una para la principal y otra más.
  const soon = (s: Slot): boolean =>
    s.startsAt.getTime() > now.getTime() + MS_PER_HOUR &&
    s.startsAt.getTime() <= now.getTime() + 24 * MS_PER_HOUR;
  push({
    patient: principal,
    doctor: laura,
    slot: takeSlot(laura, principal, 0, soon),
    status: 'BOOKED',
    reason: 'Molestias digestivas',
  });
  push({
    patient: others[0] as PatientRef,
    doctor: laura,
    slot: takeSlot(laura, others[0] as PatientRef, 0, soon),
    status: 'BOOKED',
    reason: 'Chequeo anual',
  });
  // Pasadas y aún reservadas con Laura Medina: para demostrar el registro de atención (RN-26).
  push({
    patient: others[1] as PatientRef,
    doctor: laura,
    slot: takeSlot(laura, others[1] as PatientRef, -1),
    status: 'BOOKED',
    reason: 'Revisión de exámenes',
  });
  push({
    patient: others[2] as PatientRef,
    doctor: laura,
    slot: takeSlot(laura, others[2] as PatientRef, -1),
    status: 'BOOKED',
    reason: 'Consulta de seguimiento',
  });
  // Historial: 9 completadas y 6 canceladas en los últimos 30 días.
  for (let i = 0; i < 9; i += 1) {
    const doctor = pickCycle(active, i + 1);
    const patient = pickCycle(others, i);
    push({
      patient,
      doctor,
      slot: takeSlot(doctor, patient, -2 - i * 3),
      status: 'COMPLETED',
      reason: pickCycle(REASONS, i + 3),
      notes: pickCycle(NOTES, i + 2),
    });
  }
  for (let i = 0; i < 6; i += 1) {
    const doctor = pickCycle(active, i + 2);
    const patient = pickCycle(others, i + 3);
    const cancelledBy =
      i % 3 === 0 ? patient.userId : i % 3 === 1 ? doctor.userId : (adminIds[0] as number);
    push({
      patient,
      doctor,
      slot: takeSlot(doctor, patient, -3 - i * 4),
      status: 'CANCELLED',
      reason: pickCycle(REASONS, i + 5),
      cancellationReason: pickCycle(CANCEL_REASONS, i),
      cancelledByUserId: cancelledBy,
    });
  }
  // Futuras: 8 reservadas y 8 confirmadas en los próximos 14 días.
  for (let i = 0; i < 16; i += 1) {
    const doctor = pickCycle(active, i);
    const patient = pickCycle(others, i + 1);
    push({
      patient,
      doctor,
      slot: takeSlot(doctor, patient, 2 + (i % 12)),
      status: i % 2 === 0 ? 'BOOKED' : 'CONFIRMED',
      reason: pickCycle(REASONS, i + 1),
    });
  }
  return bookings;
}

async function seedBookings(bookings: Booking[]): Promise<void> {
  for (const b of bookings) {
    const created = await prisma.appointment.create({
      data: {
        patientId: b.patient.id,
        doctorId: b.doctor.id,
        startsAt: b.slot.startsAt,
        endsAt: b.slot.endsAt,
        status: b.status,
        reason: b.reason ?? null,
        notes: b.notes ?? null,
        cancellationReason: b.cancellationReason ?? null,
        cancelledByUserId: b.cancelledByUserId ?? null,
      },
    });
    const ctx = {
      startsAt: b.slot.startsAt,
      doctorName: b.doctor.name,
      patientName: b.patient.name,
    };
    const readAt = new Date();
    const items = [
      {
        userId: b.patient.userId,
        type: 'APPOINTMENT_BOOKED' as const,
        message: notificationMessages.bookedForPatient(ctx),
      },
      {
        userId: b.doctor.userId,
        type: 'APPOINTMENT_BOOKED' as const,
        message: notificationMessages.bookedForDoctor(ctx),
      },
    ];
    if (b.status === 'CONFIRMED')
      items.push({
        userId: b.doctor.userId,
        type: 'APPOINTMENT_CONFIRMED' as never,
        message: notificationMessages.confirmedForDoctor(ctx),
      });
    if (b.status === 'COMPLETED')
      items.push({
        userId: b.patient.userId,
        type: 'APPOINTMENT_COMPLETED' as never,
        message: notificationMessages.completedForPatient(ctx),
      });
    if (b.status === 'CANCELLED')
      items.push(
        {
          userId: b.patient.userId,
          type: 'APPOINTMENT_CANCELLED' as never,
          message: notificationMessages.cancelled(ctx, b.cancellationReason ?? ''),
        },
        {
          userId: b.doctor.userId,
          type: 'APPOINTMENT_CANCELLED' as never,
          message: notificationMessages.cancelled(ctx, b.cancellationReason ?? ''),
        },
      );
    await prisma.notification.createMany({
      data: items.map((n) => ({ ...n, appointmentId: created.id, readAt })),
    });
  }
}

async function main(): Promise<void> {
  const existing = await prisma.user.count();
  if (existing > 0 && process.env.SEED_FORCE !== '1') {
    console.log(`Semilla omitida: ya hay ${existing} usuarios. Use SEED_FORCE=1 para reiniciar.`);
    return;
  }
  if (existing > 0) await reset();

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  const { doctorRefs, patientRefs, adminIds } = await seedUsers(passwordHash);
  const bookings = planBookings(doctorRefs, patientRefs, adminIds);
  await seedBookings(bookings);

  // Aviso de cuenta creada para médicos y administradores, y 3 avisos sin leer para el paciente principal.
  await prisma.notification.createMany({
    data: [
      ...doctorRefs.map((d) => ({
        userId: d.userId,
        type: 'ACCOUNT_CREATED' as const,
        message: notificationMessages.accountCreated(ROLE_LABELS.DOCTOR),
        readAt: new Date(),
      })),
      ...adminIds.map((id) => ({
        userId: id,
        type: 'ACCOUNT_CREATED' as const,
        message: notificationMessages.accountCreated(ROLE_LABELS.ADMIN),
        readAt: new Date(),
      })),
    ],
  });
  const principal = patientRefs[0] as PatientRef;
  const latest = await prisma.notification.findMany({
    where: { userId: principal.userId },
    orderBy: { id: 'desc' },
    take: 3,
    select: { id: true },
  });
  await prisma.notification.updateMany({
    where: { id: { in: latest.map((n) => n.id) } },
    data: { readAt: null },
  });

  const summary = await prisma.appointment.groupBy({ by: ['status'], _count: true });
  console.log('Semilla cargada:', {
    usuarios: await prisma.user.count(),
    citas: summary.map((s) => `${s.status}=${s._count}`).join(' '),
  });
  console.log(`Contraseña de todas las cuentas: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
