import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthContext } from '@/server/http/handler';
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
} from '@/server/services/appointments.service';
import { getDaySlots } from '@/server/services/availability.service';
import { listNotifications } from '@/server/services/notifications.service';
import {
  AHORA,
  MIERCOLES,
  crearEspecialidad,
  crearMedico,
  crearPaciente,
  limpiarBase,
  pagina,
} from './helpers';

// Módulo de citas: el recorrido completo de especificacion/08 §3.2 y la concurrencia de §3.3,
// ejecutados con los servicios de dominio que usa la API.

let paciente: AuthContext;
let otroPaciente: AuthContext;
let medico: AuthContext;
const doctorId = (): number => medico.doctorId ?? 0;

beforeEach(async () => {
  await limpiarBase();
  const especialidad = await crearEspecialidad();
  medico = await crearMedico('01', especialidad);
  paciente = await crearPaciente('01');
  otroPaciente = await crearPaciente('02');
});

async function primerCupoLibre(): Promise<string> {
  const dia = await getDaySlots(doctorId(), MIERCOLES, {
    now: AHORA,
    patientId: paciente.patientId,
  });
  const libre = dia.slots.find((s) => s.available);
  if (!libre) throw new Error('No hay cupos libres en la jornada de prueba');
  return libre.startsAt;
}

describe('módulo de citas: recorrido completo (08 §3.2)', () => {
  it('reserva, confirma, atiende y deja historial y notificaciones', async () => {
    // 2–3. Consultar los cupos y reservar el primero libre.
    const inicio = await primerCupoLibre();
    expect(inicio).toBe('2027-03-03T13:00:00.000Z'); // 08:00 en Bogotá
    const cita = await createAppointment(
      paciente,
      { doctorId: doctorId(), startsAt: inicio, reason: 'Control' },
      AHORA,
    );
    expect(cita).toMatchObject({
      status: 'BOOKED',
      startsAt: inicio,
      endsAt: '2027-03-03T13:30:00.000Z',
    });

    // 4. El cupo deja de estar disponible.
    const despues = await getDaySlots(doctorId(), MIERCOLES, {
      now: AHORA,
      patientId: otroPaciente.patientId,
    });
    expect(despues.slots.find((s) => s.startsAt === inicio)?.available).toBe(false);

    // 5. Un segundo paciente intenta el mismo cupo.
    await expect(
      createAppointment(otroPaciente, { doctorId: doctorId(), startsAt: inicio }, AHORA),
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN', status: 409 });

    // 6. El paciente confirma.
    await expect(confirmAppointment(paciente, cita.id, AHORA)).resolves.toMatchObject({
      status: 'CONFIRMED',
    });

    // 7. El médico registra la atención cuando la hora ya pasó.
    const durante = new Date('2027-03-03T13:20:00.000Z');
    await expect(
      completeAppointment(medico, { id: cita.id, notes: 'Estable' }, durante),
    ).resolves.toMatchObject({
      status: 'COMPLETED',
    });

    // 8. Aparece en el historial del paciente.
    const historial = await listAppointments(paciente, { ...pagina, scope: 'history' }, durante);
    expect(historial.items.map((c) => c.id)).toContain(cita.id);

    // 9. Se generaron los avisos: reservada (ambos), confirmada (médico) y atendida (paciente).
    //    El médico tiene además el aviso de bienvenida de su cuenta.
    const avisosPaciente = await listNotifications(paciente.userId, pagina);
    const avisosMedico = await listNotifications(medico.userId, pagina);
    expect(avisosPaciente.items.map((n) => n.type).sort()).toEqual([
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_COMPLETED',
    ]);
    expect(avisosMedico.items.map((n) => n.type).sort()).toEqual([
      'ACCOUNT_CREATED',
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_CONFIRMED',
    ]);
  });

  it('no deja registrar la atención antes de la hora de la cita (RN-26)', async () => {
    const cita = await createAppointment(
      paciente,
      { doctorId: doctorId(), startsAt: await primerCupoLibre() },
      AHORA,
    );
    await expect(completeAppointment(medico, { id: cita.id }, AHORA)).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
  });

  it('el paciente no cancela con 24 horas o menos, pero el médico sí (RN-24)', async () => {
    const cita = await createAppointment(
      paciente,
      { doctorId: doctorId(), startsAt: await primerCupoLibre() },
      AHORA,
    );
    const elDiaAntes = new Date('2027-03-02T14:00:00.000Z'); // 23 h antes
    await expect(
      cancelAppointment(paciente, { id: cita.id, reason: 'Viaje' }, elDiaAntes),
    ).rejects.toMatchObject({
      code: 'CANCELLATION_WINDOW_CLOSED',
    });
    const cancelada = await cancelAppointment(
      medico,
      { id: cita.id, reason: 'Incapacidad' },
      elDiaAntes,
    );
    expect(cancelada).toMatchObject({ status: 'CANCELLED', cancellationReason: 'Incapacidad' });
    // La contraparte (el paciente) recibe el aviso.
    const avisos = await listNotifications(paciente.userId, pagina);
    expect(avisos.items.some((n) => n.type === 'APPOINTMENT_CANCELLED')).toBe(true);
  });

  it('un paciente no ve ni confirma la cita de otro (RN-28)', async () => {
    const cita = await createAppointment(
      paciente,
      { doctorId: doctorId(), startsAt: await primerCupoLibre() },
      AHORA,
    );
    await expect(getAppointment(otroPaciente, cita.id, AHORA)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(confirmAppointment(otroPaciente, cita.id, AHORA)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('solo un paciente puede reservar', async () => {
    await expect(
      createAppointment(medico, { doctorId: doctorId(), startsAt: await primerCupoLibre() }, AHORA),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('módulo de citas: concurrencia (08 §3.3)', () => {
  it('dos pacientes reservan el mismo cupo a la vez y exactamente uno gana', async () => {
    const inicio = await primerCupoLibre();
    const resultados = await Promise.allSettled([
      createAppointment(paciente, { doctorId: doctorId(), startsAt: inicio }, AHORA),
      createAppointment(otroPaciente, { doctorId: doctorId(), startsAt: inicio }, AHORA),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});
