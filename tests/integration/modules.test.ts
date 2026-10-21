import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthContext } from '@/server/http/handler';
import { changePassword, getProfile, login, updateProfile } from '@/server/services/auth.service';
import { createAppointment } from '@/server/services/appointments.service';
import {
  getDaySlots,
  getMonthAvailability,
  listDoctors,
} from '@/server/services/availability.service';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server/services/notifications.service';
import { getAppointmentsBySpecialty, getDashboard } from '@/server/services/reports.service';
import {
  getSchedules,
  replaceSchedules,
  updateDoctorDuration,
} from '@/server/services/schedules.service';
import { createUser, listUsers, resetPassword, updateUser } from '@/server/services/users.service';
import {
  AHORA,
  CLAVE,
  MIERCOLES,
  crearAdmin,
  crearEspecialidad,
  crearMedico,
  crearPaciente,
  limpiarBase,
  pagina,
  prisma,
} from './helpers';

// Pruebas de cada módulo de MediCitas contra PostgreSQL real, con los servicios de dominio que
// usa la API. El recorrido de citas está en booking.test.ts; las restricciones, en constraints.test.ts.

let especialidad: number;
let admin: AuthContext;
let medico: AuthContext;
let paciente: AuthContext;

beforeEach(async () => {
  await limpiarBase();
  especialidad = await crearEspecialidad();
  admin = await crearAdmin();
  medico = await crearMedico('01', especialidad);
  paciente = await crearPaciente('01');
});

describe('módulo de autenticación y perfil', () => {
  it('inicia sesión con la clave correcta y nunca devuelve el hash', async () => {
    const usuario = await login({ email: 'paciente01@pruebas.com', password: CLAVE });
    expect(usuario).toMatchObject({ role: 'PATIENT', email: 'paciente01@pruebas.com' });
    expect(usuario).not.toHaveProperty('passwordHash');
  });

  it('no distingue entre clave incorrecta, correo inexistente y cuenta inactiva (CU-02)', async () => {
    await expect(
      login({ email: 'paciente01@pruebas.com', password: 'Otra2026x' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(login({ email: 'nadie@pruebas.com', password: CLAVE })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await updateUser(admin.userId, paciente.userId, { isActive: false });
    await expect(login({ email: 'paciente01@pruebas.com', password: CLAVE })).rejects.toMatchObject(
      { code: 'INVALID_CREDENTIALS' },
    );
  });

  it('el registro rechaza un correo repetido (restricción única)', async () => {
    await expect(crearPaciente('01')).rejects.toMatchObject({ code: 'P2002' });
  });

  it('edita el perfil según el rol y rechaza campos de otro rol', async () => {
    const perfil = await updateProfile(paciente.userId, {
      phone: '3001112233',
      healthProvider: 'Sura EPS',
    });
    expect(perfil).toMatchObject({ phone: '3001112233', patient: { healthProvider: 'Sura EPS' } });
    await expect(
      updateProfile(paciente.userId, { appointmentDurationMinutes: 20 }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('cambia la contraseña solo si la actual es correcta (CU-05)', async () => {
    await expect(
      changePassword(paciente.userId, { currentPassword: 'Mala2026x', newPassword: 'Nueva2027x' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await changePassword(paciente.userId, { currentPassword: CLAVE, newPassword: 'Nueva2027x' });
    await expect(
      login({ email: 'paciente01@pruebas.com', password: 'Nueva2027x' }),
    ).resolves.toMatchObject({ id: paciente.userId });
    expect((await getProfile(paciente.userId)).role).toBe('PATIENT');
  });
});

describe('módulo de catálogo y disponibilidad', () => {
  it('lista solo médicos con jornada configurada (RN-16)', async () => {
    const sinJornada = await crearMedico('02', especialidad);
    await replaceSchedules(sinJornada.doctorId ?? 0, { schedules: [] }, AHORA);
    const lista = await listDoctors(
      { ...pagina, specialtyId: especialidad },
      AHORA,
      paciente.patientId,
    );
    expect(lista.items.map((m) => m.id)).toEqual([medico.doctorId]);
  });

  it('calcula cupos de 30 min en la jornada y respeta la anticipación mínima (RN-14)', async () => {
    const dia = await getDaySlots(medico.doctorId ?? 0, MIERCOLES, {
      now: AHORA,
      patientId: paciente.patientId,
    });
    expect(dia.slots).toHaveLength(8); // 08:00–12:00
    expect(dia.slots.every((s) => s.available)).toBe(true);
    const hoy = await getDaySlots(medico.doctorId ?? 0, '2027-03-01', {
      now: AHORA,
      patientId: paciente.patientId,
    });
    // A las 07:00 con 2 h de anticipación, los cupos de 08:00 y 08:30 ya no se ofrecen.
    expect(hoy.slots.some((s) => s.startsAt === '2027-03-01T13:00:00.000Z')).toBe(false);
  });

  it('la disponibilidad del mes no incluye fines de semana sin jornada', async () => {
    const mes = await getMonthAvailability(medico.doctorId ?? 0, '2027-03', {
      now: AHORA,
      patientId: paciente.patientId,
    });
    const sabado = mes.days.find((d) => d.date === '2027-03-06');
    expect(sabado?.availableSlots ?? 0).toBe(0);
    expect(mes.days.find((d) => d.date === MIERCOLES)?.availableSlots).toBe(8);
  });
});

describe('módulo de horarios del médico', () => {
  it('rechaza franjas solapadas (RN-12)', async () => {
    const solapadas = [
      { weekday: 1, startTime: '08:00', endTime: '12:00' },
      { weekday: 1, startTime: '11:00', endTime: '13:00' },
    ];
    await expect(
      replaceSchedules(medico.doctorId ?? 0, { schedules: solapadas }, AHORA),
    ).rejects.toMatchObject({ code: 'SCHEDULE_OVERLAP' });
  });

  it('avisa de citas que quedan fuera de la nueva jornada sin borrarlas (RN-17)', async () => {
    const cupos = await getDaySlots(medico.doctorId ?? 0, MIERCOLES, {
      now: AHORA,
      patientId: paciente.patientId,
    });
    await createAppointment(
      paciente,
      { doctorId: medico.doctorId ?? 0, startsAt: cupos.slots[0]?.startsAt ?? '' },
      AHORA,
    );
    const respuesta = await replaceSchedules(
      medico.doctorId ?? 0,
      { schedules: [{ weekday: 1, startTime: '14:00', endTime: '17:00' }] },
      AHORA,
    );
    expect(respuesta.warning?.affectedAppointments).toBe(1);
    expect(await prisma.appointment.count({ where: { status: 'BOOKED' } })).toBe(1);
  });

  it('cambia la duración de la consulta (RN-09)', async () => {
    await updateDoctorDuration(medico.doctorId ?? 0, 20);
    expect((await getSchedules(medico.doctorId ?? 0)).appointmentDurationMinutes).toBe(20);
  });
});

describe('módulo de administración de usuarios', () => {
  it('crea un médico con contraseña temporal que sirve para entrar (RN-08.1)', async () => {
    const { user, temporaryPassword } = await createUser({
      role: 'DOCTOR',
      documentType: 'CC',
      documentNumber: '30111222',
      firstName: 'Camila',
      lastName: 'Rojas',
      email: 'camila@pruebas.com',
      specialtyId: especialidad,
      licenseNumber: 'RM-777',
      appointmentDurationMinutes: 20,
    });
    expect(user.role).toBe('DOCTOR');
    await expect(
      login({ email: 'camila@pruebas.com', password: temporaryPassword }),
    ).resolves.toMatchObject({ id: user.id });
  });

  it('restablece la contraseña: la anterior deja de servir', async () => {
    const nueva = await resetPassword(paciente.userId);
    await expect(login({ email: 'paciente01@pruebas.com', password: CLAVE })).rejects.toMatchObject(
      { code: 'INVALID_CREDENTIALS' },
    );
    await expect(
      login({ email: 'paciente01@pruebas.com', password: nueva }),
    ).resolves.toMatchObject({ id: paciente.userId });
  });

  it('el administrador no puede desactivarse a sí mismo (RN-08.4)', async () => {
    await expect(updateUser(admin.userId, admin.userId, { isActive: false })).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
  });

  it('busca usuarios por rol y nunca expone el hash (RN-31)', async () => {
    const medicos = await listUsers({ ...pagina, role: 'DOCTOR' });
    expect(medicos.total).toBe(1);
    expect(JSON.stringify(medicos)).not.toContain('passwordHash');
  });
});

describe('módulo de notificaciones', () => {
  it('lista, marca una y marca todas; no deja tocar avisos ajenos', async () => {
    const cupos = await getDaySlots(medico.doctorId ?? 0, MIERCOLES, {
      now: AHORA,
      patientId: paciente.patientId,
    });
    await createAppointment(
      paciente,
      { doctorId: medico.doctorId ?? 0, startsAt: cupos.slots[0]?.startsAt ?? '' },
      AHORA,
    );
    // El médico tiene el aviso de bienvenida de su cuenta y el de la cita, el más reciente primero.
    const avisos = await listNotifications(medico.userId, pagina);
    expect(avisos.items.map((n) => n.type)).toEqual(['APPOINTMENT_BOOKED', 'ACCOUNT_CREATED']);
    expect(avisos.unreadCount).toBe(2);
    const aviso = avisos.items[0]?.id ?? 0;
    await expect(markNotificationRead(paciente.userId, aviso)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await markNotificationRead(medico.userId, aviso);
    expect(
      (await listNotifications(medico.userId, { ...pagina, unreadOnly: true })).unreadCount,
    ).toBe(1);
    expect(await markAllNotificationsRead(medico.userId)).toBe(1);
    expect((await listNotifications(medico.userId, pagina)).unreadCount).toBe(0);
  });
});

describe('módulo de panel y reportes', () => {
  it('el panel responde según el rol y el reporte cuenta solo citas no canceladas (RN-36, RN-37)', async () => {
    const cupos = await getDaySlots(medico.doctorId ?? 0, MIERCOLES, {
      now: AHORA,
      patientId: paciente.patientId,
    });
    await createAppointment(
      paciente,
      { doctorId: medico.doctorId ?? 0, startsAt: cupos.slots[0]?.startsAt ?? '' },
      AHORA,
    );
    expect(await getDashboard(paciente, AHORA)).toMatchObject({
      role: 'PATIENT',
      upcomingCount: 1,
    });
    expect(await getDashboard(admin, AHORA)).toMatchObject({
      role: 'ADMIN',
      registeredPatients: 1,
    });
    const reporte = await getAppointmentsBySpecialty(
      { from: '2027-03-01', to: '2027-03-31' },
      AHORA,
    );
    expect(reporte.items).toEqual([
      { specialtyId: especialidad, specialtyName: 'Pediatría', total: 1 },
    ]);
  });
});
