import { describe, expect, it } from 'vitest';
import {
  addClinicDays,
  combineClinicDateTime,
  formatDate,
  formatTime,
  getIsoWeekday,
  prismaTimeToString,
  stringToPrismaTime,
  toClinicDateString,
} from './datetime';

describe('datetime (RN-01, RN-03)', () => {
  it('Bogotá → UTC', () => {
    expect(combineClinicDateTime('2026-09-22', '08:00').toISOString()).toBe(
      '2026-09-22T13:00:00.000Z',
    );
  });
  it('UTC → fecha de Bogotá cruza la medianoche correctamente', () => {
    expect(toClinicDateString(new Date('2026-09-23T03:30:00.000Z'))).toBe('2026-09-22');
  });
  it('día de la semana ISO: domingo = 7, lunes = 1', () => {
    expect(getIsoWeekday('2026-10-11')).toBe(7);
    expect(getIsoWeekday('2026-10-05')).toBe(1);
  });
  it('suma de días en fechas de la clínica', () => {
    expect(addClinicDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addClinicDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('TIME de Prisma ↔ HH:mm', () => {
    expect(prismaTimeToString(stringToPrismaTime('14:30'))).toBe('14:30');
  });
  it('formatos en español', () => {
    const d = combineClinicDateTime('2026-09-22', '08:00');
    expect(formatDate(d)).toBe('22 de septiembre de 2026');
    expect(formatTime(d)).toMatch(/8:00 a\.\s?m\./);
  });
});
