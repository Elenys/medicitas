import { describe, expect, it } from 'vitest';
import {
  countWeeklySlots,
  findScheduleOverlap,
  generateDaySlots,
  padInterval,
  padIntervals,
  type BusyInterval,
} from './availability';
import { PATIENT_APPOINTMENT_GAP_MINUTES } from './constants';
import { combineClinicDateTime, toClinicTimeString } from './datetime';

// Casos de especificacion/08 §2.1. Fecha de referencia: lunes 2026-10-05.
const MONDAY = '2026-10-05';
const WEDNESDAY = '2026-10-07';
const SUNDAY = '2026-10-11';
const NOW = combineClinicDateTime('2026-10-01', '10:00'); // 4 días antes, sin conflicto de ventana

const times = (
  date: string,
  schedules: Parameters<typeof generateDaySlots>[0]['schedules'],
  duration: number,
  busy: BusyInterval[] = [],
  now = NOW,
) =>
  generateDaySlots({ date, schedules, durationMinutes: duration, busy, now }).map(
    (s) => `${toClinicTimeString(s.startsAt)}${s.available ? '' : 'x'}`,
  );

describe('generateDaySlots (RN-13)', () => {
  it('1. franja que divide exacto: 08:00–12:00 / 30 → 8 cupos', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '12:00' }], 30)).toEqual([
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
    ]);
  });

  it('2. franja que no divide exacto: 08:00–09:20 / 30 → 2 cupos, se descartan 20 min', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '09:20' }], 30)).toEqual([
      '08:00',
      '08:30',
    ]);
  });

  it('3. dos franjas el mismo día sin cupos entre ellas', () => {
    const schedules = [
      { weekday: 1, startTime: '08:00', endTime: '12:00' },
      { weekday: 1, startTime: '14:00', endTime: '17:00' },
    ];
    expect(times(MONDAY, schedules, 60)).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '14:00',
      '15:00',
      '16:00',
    ]);
  });

  it('4. día sin franjas → 0 cupos', () => {
    expect(times(WEDNESDAY, [{ weekday: 1, startTime: '08:00', endTime: '12:00' }], 30)).toEqual(
      [],
    );
  });

  it('5. franja más corta que la duración → 0 cupos', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '08:20' }], 30)).toEqual([]);
  });

  it('6. duración mínima 10 → 6 cupos en una hora', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '09:00' }], 10)).toHaveLength(
      6,
    );
  });

  it('7. duración máxima 120 → 2 cupos en 4 horas', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '12:00' }], 120)).toHaveLength(
      2,
    );
  });

  it('8. cupo ocupado por cita activa', () => {
    const busy = [
      {
        startsAt: combineClinicDateTime(MONDAY, '09:00'),
        endsAt: combineClinicDateTime(MONDAY, '09:30'),
      },
    ];
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '10:00' }], 30, busy)).toEqual(
      ['08:00', '08:30', '09:00x', '09:30'],
    );
  });

  it('9. cupo liberado tras cancelación (la cita cancelada no viene en busy)', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '10:00' }], 30, [])).toContain(
      '09:00',
    );
  });

  it('8b. solapamiento parcial también ocupa', () => {
    const busy = [
      {
        startsAt: combineClinicDateTime(MONDAY, '08:15'),
        endsAt: combineClinicDateTime(MONDAY, '08:45'),
      },
    ];
    expect(times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '09:00' }], 30, busy)).toEqual(
      ['08:00x', '08:30x'],
    );
  });

  it('11. anticipación mínima: hoy a las 10:00 no se ofrecen cupos antes de las 12:00', () => {
    const now = combineClinicDateTime(MONDAY, '10:00');
    expect(
      times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '14:00' }], 60, [], now),
    ).toEqual(['12:00', '13:00']);
  });

  it('12. anticipación máxima: a 61 días → 0 cupos', () => {
    expect(times('2026-12-01', [{ weekday: 2, startTime: '08:00', endTime: '12:00' }], 30)).toEqual(
      [],
    );
  });

  it('13. límite exacto de 60 días → se ofrecen', () => {
    // NOW = 2026-10-01 → +60 días = 2026-11-30 (lunes)
    expect(
      times('2026-11-30', [{ weekday: 1, startTime: '08:00', endTime: '09:00' }], 30).length,
    ).toBeGreaterThan(0);
  });

  it('14. domingo se consulta como weekday 7, no 0', () => {
    expect(times(SUNDAY, [{ weekday: 7, startTime: '08:00', endTime: '09:00' }], 30)).toEqual([
      '08:00',
      '08:30',
    ]);
    expect(times(SUNDAY, [{ weekday: 0, startTime: '08:00', endTime: '09:00' }], 30)).toEqual([]);
  });

  it('15. zona horaria: 08:00 Bogotá es 13:00Z', () => {
    const [slot] = generateDaySlots({
      date: MONDAY,
      schedules: [{ weekday: 1, startTime: '08:00', endTime: '09:00' }],
      durationMinutes: 30,
      busy: [],
      now: NOW,
    });
    expect(slot?.startsAt.toISOString()).toBe('2026-10-05T13:00:00.000Z');
  });

  it('16. frontera de medianoche: 23:00–23:59 no se desborda', () => {
    expect(times(MONDAY, [{ weekday: 1, startTime: '23:00', endTime: '23:59' }], 30)).toEqual([
      '23:00',
    ]);
  });
});

describe('findScheduleOverlap (RN-12)', () => {
  it('detecta dos franjas solapadas el mismo día', () => {
    expect(
      findScheduleOverlap([
        { weekday: 1, startTime: '08:00', endTime: '12:00' },
        { weekday: 1, startTime: '11:00', endTime: '14:00' },
      ]),
    ).not.toBeNull();
  });
  it('franjas consecutivas no se solapan', () => {
    expect(
      findScheduleOverlap([
        { weekday: 1, startTime: '08:00', endTime: '12:00' },
        { weekday: 1, startTime: '12:00', endTime: '14:00' },
      ]),
    ).toBeNull();
  });
});

describe('countWeeklySlots', () => {
  it('suma los cupos de todas las franjas', () => {
    expect(
      countWeeklySlots(
        [
          { weekday: 1, startTime: '08:00', endTime: '12:00' },
          { weekday: 3, startTime: '08:00', endTime: '09:20' },
        ],
        30,
      ),
    ).toBe(10);
  });
});

describe('padInterval y la separación entre citas del paciente (RN-21.7)', () => {
  const cita = (from: string, to: string): BusyInterval => ({
    startsAt: combineClinicDateTime(MONDAY, from),
    endsAt: combineClinicDateTime(MONDAY, to),
  });

  it('amplía el intervalo el margen indicado hacia cada lado', () => {
    const padded = padInterval(cita('09:00', '09:30'), PATIENT_APPOINTMENT_GAP_MINUTES);
    expect(toClinicTimeString(padded.startsAt)).toBe('08:00');
    expect(toClinicTimeString(padded.endsAt)).toBe('10:30');
  });

  it('bloquea los cupos a menos de una hora de una cita ya reservada, aunque sea con otro médico', () => {
    const agendaDelPaciente = padIntervals(
      [cita('09:00', '09:30')],
      PATIENT_APPOINTMENT_GAP_MINUTES,
    );
    expect(
      times(MONDAY, [{ weekday: 1, startTime: '08:00', endTime: '11:00' }], 30, agendaDelPaciente),
    ).toEqual(['08:00x', '08:30x', '09:00x', '09:30x', '10:00x', '10:30']);
  });

  it('acepta el cupo que empieza exactamente una hora después de terminar la cita', () => {
    const agendaDelPaciente = padIntervals(
      [cita('08:00', '08:30')],
      PATIENT_APPOINTMENT_GAP_MINUTES,
    );
    const libres = times(
      MONDAY,
      [{ weekday: 1, startTime: '08:00', endTime: '10:30' }],
      30,
      agendaDelPaciente,
    );
    expect(libres).toContain('09:30');
    expect(libres).toContain('09:00x');
  });
});
