import { describe, expect, it } from 'vitest';
import {
  canCancel,
  canComplete,
  canConfirm,
  canView,
  isCancellationWindowOpen,
  type AppointmentLike,
  type Viewer,
} from './appointment-rules';
import { addHours } from './datetime';

const NOW = new Date('2026-10-05T15:00:00.000Z');
const owner: Viewer = { userId: 1, role: 'PATIENT', patientId: 10 };
const otherPatient: Viewer = { userId: 2, role: 'PATIENT', patientId: 11 };
const doctor: Viewer = { userId: 3, role: 'DOCTOR', doctorId: 20 };
const otherDoctor: Viewer = { userId: 4, role: 'DOCTOR', doctorId: 21 };
const admin: Viewer = { userId: 5, role: 'ADMIN' };

const appt = (over: Partial<AppointmentLike> = {}): AppointmentLike => ({
  status: 'BOOKED',
  startsAt: addHours(NOW, 48),
  patientId: 10,
  doctorId: 20,
  ...over,
});

describe('permisos (RN-28 a RN-30)', () => {
  it('ver: titular, médico asignado y admin', () => {
    expect(canView(appt(), owner)).toBe(true);
    expect(canView(appt(), otherPatient)).toBe(false);
    expect(canView(appt(), doctor)).toBe(true);
    expect(canView(appt(), otherDoctor)).toBe(false);
    expect(canView(appt(), admin)).toBe(true);
  });
  it('confirmar: solo el titular', () => {
    expect(canConfirm(appt(), owner, NOW)).toBe(true);
    expect(canConfirm(appt(), doctor, NOW)).toBe(false);
    expect(canConfirm(appt(), admin, NOW)).toBe(false);
  });
  it('completar: solo el médico asignado', () => {
    const past = appt({ startsAt: addHours(NOW, -1) });
    expect(canComplete(past, doctor, NOW)).toBe(true);
    expect(canComplete(past, otherDoctor, NOW)).toBe(false);
    expect(canComplete(past, owner, NOW)).toBe(false);
    expect(canComplete(past, admin, NOW)).toBe(false);
  });
});

describe('transiciones (RN-18, RN-19)', () => {
  it('CONFIRMED no se vuelve a confirmar', () => {
    expect(canConfirm(appt({ status: 'CONFIRMED' }), owner, NOW)).toBe(false);
  });
  it('COMPLETED y CANCELLED son terminales', () => {
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      expect(canCancel(appt({ status }), admin, NOW)).toBe(false);
      expect(canComplete(appt({ status, startsAt: addHours(NOW, -1) }), doctor, NOW)).toBe(false);
      expect(canConfirm(appt({ status }), owner, NOW)).toBe(false);
    }
  });
  it('CONFIRMED se puede cancelar y completar', () => {
    expect(canCancel(appt({ status: 'CONFIRMED' }), owner, NOW)).toBe(true);
    expect(
      canComplete(appt({ status: 'CONFIRMED', startsAt: addHours(NOW, -1) }), doctor, NOW),
    ).toBe(true);
  });
});

describe('ventana de cancelación (RN-24)', () => {
  it('1. paciente, faltan 25 h → puede', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, 25) }), owner, NOW)).toBe(true));
  it('2. paciente, exactamente 24 h → no puede (límite estricto)', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, 24) }), owner, NOW)).toBe(false));
  it('3. paciente, faltan 23 h → no puede', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, 23) }), owner, NOW)).toBe(false));
  it('4. médico, faltan 23 h → puede', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, 23) }), doctor, NOW)).toBe(true));
  it('5. admin, falta 1 h → puede', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, 1) }), admin, NOW)).toBe(true));
  it('6. paciente, la cita ya pasó → no puede', () =>
    expect(canCancel(appt({ startsAt: addHours(NOW, -1) }), owner, NOW)).toBe(false));
  it('isCancellationWindowOpen es estricto en el límite', () => {
    expect(isCancellationWindowOpen(addHours(NOW, 24), NOW)).toBe(false);
    expect(isCancellationWindowOpen(new Date(addHours(NOW, 24).getTime() + 1), NOW)).toBe(true);
  });
});

describe('completar (RN-26)', () => {
  it('1. la hora ya pasó → puede', () =>
    expect(canComplete(appt({ startsAt: addHours(NOW, -1) }), doctor, NOW)).toBe(true));
  it('2. hora futura → no puede', () =>
    expect(canComplete(appt({ startsAt: addHours(NOW, 1) }), doctor, NOW)).toBe(false));
  it('3. justo en la hora de inicio → puede', () =>
    expect(canComplete(appt({ startsAt: NOW }), doctor, NOW)).toBe(true));
});
