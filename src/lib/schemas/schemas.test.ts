import { describe, expect, it } from 'vitest';
import {
  availabilityQuerySchema,
  cancelAppointmentSchema,
  createUserSchema,
  durationSchema,
  passwordSchema,
  registerSchema,
  scheduleItemSchema,
} from './index';

describe('esquemas Zod', () => {
  it('mes de disponibilidad: solo de 01 a 12', () => {
    expect(availabilityQuerySchema.safeParse({ month: '2026-10' }).success).toBe(true);
    expect(availabilityQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false);
    expect(availabilityQuerySchema.safeParse({ month: '2026-00' }).success).toBe(false);
  });

  it('contraseña: exige minúscula, mayúscula y dígito (RN-04)', () => {
    expect(passwordSchema.safeParse('Medicitas2026').success).toBe(true);
    expect(passwordSchema.safeParse('medicitas2026').success).toBe(false);
    expect(passwordSchema.safeParse('MEDICITAS2026').success).toBe(false);
    expect(passwordSchema.safeParse('Medicitas').success).toBe(false);
    expect(passwordSchema.safeParse('Me2026').success).toBe(false);
  });
  it('registro válido', () => {
    const result = registerSchema.safeParse({
      documentType: 'CC',
      documentNumber: '1098765432',
      firstName: 'Laura',
      lastName: 'Gómez',
      email: 'Laura.Gomez@correo.com',
      password: 'Medicitas2026',
      birthDate: '1995-04-17',
      gender: 'FEMALE',
      phone: '',
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('laura.gomez@correo.com');
    expect(result.data?.phone).toBeUndefined();
  });
  it('registro rechaza correo malformado y fecha futura', () => {
    expect(
      registerSchema.safeParse({
        documentType: 'CC',
        documentNumber: '12345',
        firstName: 'A B',
        lastName: 'C D',
        email: 'no-es-correo',
        password: 'Medicitas2026',
        birthDate: '1995-04-17',
        gender: 'MALE',
      }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({
        documentType: 'CC',
        documentNumber: '12345',
        firstName: 'A B',
        lastName: 'C D',
        email: 'a@b.co',
        password: 'Medicitas2026',
        birthDate: '2999-01-01',
        gender: 'MALE',
      }).success,
    ).toBe(false);
  });
  it('duración entre 10 y 120 (RN-09)', () => {
    expect(durationSchema.safeParse(5).success).toBe(false);
    expect(durationSchema.safeParse(121).success).toBe(false);
    expect(durationSchema.safeParse('30').success).toBe(true);
  });
  it('motivo de cancelación demasiado corto (RN-24.1)', () => {
    expect(cancelAppointmentSchema.safeParse({ reason: 'ab' }).success).toBe(false);
    expect(cancelAppointmentSchema.safeParse({ reason: 'Imprevisto' }).success).toBe(true);
  });
  it('franja con fin anterior al inicio (RN-11)', () => {
    expect(
      scheduleItemSchema.safeParse({ weekday: 1, startTime: '10:00', endTime: '09:00' }).success,
    ).toBe(false);
  });
  it('crear usuario: paciente rechazado, médico exige especialidad y licencia (RN-08)', () => {
    const base = {
      documentType: 'CC',
      documentNumber: '79456123',
      firstName: 'Andrés',
      lastName: 'Ramírez',
      email: 'a@medicitas.com',
    };
    expect(createUserSchema.safeParse({ role: 'PATIENT', ...base }).success).toBe(false);
    expect(createUserSchema.safeParse({ role: 'DOCTOR', ...base }).success).toBe(false);
    expect(
      createUserSchema.safeParse({
        role: 'DOCTOR',
        ...base,
        specialtyId: 2,
        licenseNumber: 'RM-1',
        appointmentDurationMinutes: 20,
      }).success,
    ).toBe(true);
    expect(createUserSchema.safeParse({ role: 'ADMIN', ...base }).success).toBe(true);
  });
});
