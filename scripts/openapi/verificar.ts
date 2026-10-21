// Recorre la API real con los datos de demostración: llama a los 30 endpoints con el rol que
// corresponde y a los errores principales, comprueba cada código HTTP y guarda las peticiones
// y respuestas reales en ejemplos.json para que la documentación muestre ejemplos verdaderos.
//
// Modifica datos (registra, agenda, cancela…): ejecútelo contra una base de pruebas.
//   API_URL=http://localhost:3100 npx tsx scripts/openapi/verificar.ts

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENDPOINTS } from './catalogo';

const API = process.env.API_URL ?? 'http://localhost:3100';
const CLAVE = 'Medicitas2026';
const SALIDA = path.join(__dirname, 'ejemplos.json');

interface Ejemplo {
  titulo: string;
  rol: string;
  ruta: string;
  cuerpo?: unknown;
  respuesta: unknown;
}
const ejemplos: Record<string, Record<string, Ejemplo[]>> = {};

// Forma mínima de las respuestas que el recorrido necesita leer.
interface Pagina<T> {
  items: T[];
  totalPages: number;
}
interface Id {
  id: number;
}
interface Especialidad extends Id {
  name: string;
}
interface Dia {
  date: string;
  availableSlots: number;
}
interface Cupo {
  startsAt: string;
  available: boolean;
}
interface Franja {
  weekday: number;
  startTime: string;
  endTime: string;
}
interface Cita extends Id {
  startsAt: string;
  canCancel: boolean;
  canComplete: boolean;
}
let fallas = 0;
let llamadas = 0;

/** Cliente con su propia cookie de sesión. */
class Sesion {
  private cookie = '';
  public constructor(public readonly rol: string) {}

  /** Llama al endpoint, compara el código y guarda el ejemplo bajo la plantilla de ruta. */
  public async llamar<T = unknown>(
    metodo: string,
    plantilla: string,
    opciones: {
      ids?: Record<string, number>;
      consulta?: Record<string, string | number>;
      cuerpo?: unknown;
      espera: number;
      titulo: string;
    },
  ): Promise<T> {
    let ruta = plantilla;
    for (const [clave, valor] of Object.entries(opciones.ids ?? {}))
      ruta = ruta.replace(`{${clave}}`, String(valor));
    const qs = opciones.consulta
      ? '?' +
        new URLSearchParams(
          Object.entries(opciones.consulta).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';

    const respuesta = await fetch(API + ruta + qs, {
      method: metodo,
      headers: {
        ...(opciones.cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
    const nueva = respuesta.headers.getSetCookie().find((c) => c.startsWith('medicitas_session='));
    if (nueva) this.cookie = nueva.split(';')[0] ?? '';

    const texto = await respuesta.text();
    const datos = texto ? JSON.parse(texto) : null;
    llamadas += 1;
    const ok = respuesta.status === opciones.espera;
    if (!ok) fallas += 1;
    console.log(
      `${ok ? '✓' : '✗'} ${respuesta.status} ${metodo.padEnd(5)} ${ruta}${qs}  — ${opciones.titulo} [${this.rol}]${ok ? '' : `  (esperado ${opciones.espera}) ${texto.slice(0, 200)}`}`,
    );

    const clave = `${metodo} ${plantilla}`;
    ((ejemplos[clave] ??= {})[respuesta.status] ??= []).push({
      titulo: opciones.titulo,
      rol: this.rol,
      ruta: ruta + qs,
      cuerpo: opciones.cuerpo,
      respuesta: datos,
    });
    return datos as T;
  }

  public async entrar(correo: string, clave = CLAVE): Promise<this> {
    await this.llamar('POST', '/api/v1/auth/login', {
      cuerpo: { email: correo, password: clave },
      espera: 200,
      titulo: `Inicio de sesión (${this.rol})`,
    });
    return this;
  }
}

const hoy = new Date();
const fecha = (d: Date) => d.toISOString().slice(0, 10);
const mes = (d: Date) => d.toISOString().slice(0, 7);

async function main(): Promise<void> {
  const anonimo = new Sesion('sin sesión');
  const admin = await new Sesion('ADMIN').entrar('admin@medicitas.com');
  const pediatra = await new Sesion('DOCTOR').entrar('andres.ramirez@medicitas.com');
  const medica = await new Sesion('DOCTOR').entrar('laura.medina@medicitas.com');
  const pacienteDemo = await new Sesion('PATIENT').entrar('paciente@correo.com');
  const paciente = new Sesion('PATIENT');

  // ── Autenticación
  const registro = {
    documentType: 'CC',
    documentNumber: '1045678912',
    firstName: 'Sofía',
    lastName: 'Herrera',
    email: 'sofia.herrera@correo.com',
    phone: '3004567890',
    password: CLAVE,
    birthDate: '1998-06-14',
    gender: 'FEMALE',
    address: 'Calle 29 # 4-15, Montería',
    healthProvider: 'Nueva EPS',
  };
  await paciente.llamar('POST', '/api/v1/auth/register', {
    cuerpo: registro,
    espera: 201,
    titulo: 'Registro de un paciente nuevo',
  });
  await anonimo.llamar('POST', '/api/v1/auth/register', {
    cuerpo: registro,
    espera: 409,
    titulo: 'Correo ya registrado',
  });
  await anonimo.llamar('POST', '/api/v1/auth/register', {
    cuerpo: { email: 'correo-invalido', password: 'corta' },
    espera: 400,
    titulo: 'Datos inválidos',
  });
  await anonimo.llamar('POST', '/api/v1/auth/login', {
    cuerpo: { email: 'sofia.herrera@correo.com', password: 'Equivocada2026' },
    espera: 401,
    titulo: 'Contraseña incorrecta',
  });
  await anonimo.llamar('POST', '/api/v1/auth/login', {
    cuerpo: { email: 'inactivo@correo.com', password: CLAVE },
    espera: 401,
    titulo: 'Cuenta desactivada',
  });
  await anonimo.llamar('GET', '/api/v1/auth/me', { espera: 401, titulo: 'Sin sesión' });
  await paciente.llamar('GET', '/api/v1/auth/me', {
    espera: 200,
    titulo: 'Usuario de la sesión (paciente)',
  });
  await pediatra.llamar('GET', '/api/v1/auth/me', {
    espera: 200,
    titulo: 'Usuario de la sesión (médico)',
  });
  const salida = new Sesion('PATIENT');
  await salida.entrar('sofia.herrera@correo.com');
  await salida.llamar('POST', '/api/v1/auth/logout', { espera: 204, titulo: 'Cerrar sesión' });
  await salida.llamar('GET', '/api/v1/auth/me', {
    espera: 401,
    titulo: 'Después de cerrar sesión',
  });

  // ── Perfil
  await paciente.llamar('GET', '/api/v1/profile', { espera: 200, titulo: 'Perfil del paciente' });
  await paciente.llamar('PATCH', '/api/v1/profile', {
    cuerpo: { phone: '3017654321', healthProvider: 'Sura EPS' },
    espera: 200,
    titulo: 'Actualizar teléfono y EPS',
  });
  await paciente.llamar('PATCH', '/api/v1/profile', {
    cuerpo: { email: 'otro@correo.com' },
    espera: 400,
    titulo: 'El correo no es editable',
  });
  await paciente.llamar('PATCH', '/api/v1/profile/password', {
    cuerpo: { currentPassword: 'NoEsLaActual1', newPassword: 'Medicitas2027' },
    espera: 401,
    titulo: 'Contraseña actual incorrecta',
  });
  await paciente.llamar('PATCH', '/api/v1/profile/password', {
    cuerpo: { currentPassword: CLAVE, newPassword: 'Medicitas2027' },
    espera: 204,
    titulo: 'Cambiar contraseña',
  });

  // ── Catálogos y disponibilidad
  const especialidades = await paciente.llamar<Especialidad[]>('GET', '/api/v1/specialties', {
    espera: 200,
    titulo: 'Especialidades',
  });
  const pediatria = especialidades.find((e) => e.name === 'Pediatría');
  if (!pediatria) throw new Error('Falta la especialidad Pediatría');
  const medicos = await paciente.llamar<Pagina<Id>>('GET', '/api/v1/doctors', {
    consulta: { specialtyId: pediatria.id },
    espera: 200,
    titulo: 'Médicos de Pediatría',
  });
  const andres = medicos.items[0];
  if (!andres) throw new Error('No hay médicos de Pediatría');
  await paciente.llamar('GET', '/api/v1/doctors/{id}', {
    ids: { id: andres.id },
    espera: 200,
    titulo: 'Detalle del médico',
  });
  await paciente.llamar('GET', '/api/v1/doctors/{id}', {
    ids: { id: 999999 },
    espera: 404,
    titulo: 'Médico inexistente',
  });

  // Primer día con cupo, al menos dos días adelante (para poder cancelar con más de 24 h).
  const minimo = fecha(new Date(hoy.getTime() + 2 * 86_400_000));
  let dia: string | undefined;
  for (let i = 0; i < 3 && !dia; i += 1) {
    const m = new Date(hoy.getFullYear(), hoy.getMonth() + i, 15);
    const disp = await paciente.llamar<{ days: Dia[] }>(
      'GET',
      '/api/v1/doctors/{id}/availability',
      {
        ids: { id: andres.id },
        consulta: { month: mes(m) },
        espera: 200,
        titulo: `Disponibilidad de ${mes(m)}`,
      },
    );
    dia = disp.days.find((d) => d.date >= minimo && d.availableSlots > 0)?.date;
  }
  if (!dia) throw new Error('No hay días con cupo para el ejemplo');
  await paciente.llamar('GET', '/api/v1/doctors/{id}/availability', {
    ids: { id: andres.id },
    consulta: { month: '2026-13' },
    espera: 400,
    titulo: 'Mes con formato inválido',
  });
  const cupos = await paciente.llamar<{ slots: Cupo[] }>(
    'GET',
    '/api/v1/doctors/{id}/available-slots',
    { ids: { id: andres.id }, consulta: { date: dia }, espera: 200, titulo: 'Cupos del día' },
  );
  const cupo = cupos.slots.find((s) => s.available);
  if (!cupo) throw new Error('No hay cupos libres');

  // ── Horarios del médico
  const horario = await pediatra.llamar<{
    appointmentDurationMinutes: number;
    schedules: Franja[];
  }>('GET', '/api/v1/doctors/me/schedules', { espera: 200, titulo: 'Franjas del médico' });
  const franjas = horario.schedules.map(({ weekday, startTime, endTime }) => ({
    weekday,
    startTime,
    endTime,
  }));
  await pediatra.llamar('PUT', '/api/v1/doctors/me/schedules', {
    cuerpo: { schedules: franjas },
    espera: 200,
    titulo: 'Guardar las franjas de la semana',
  });
  await pediatra.llamar('PUT', '/api/v1/doctors/me/schedules', {
    cuerpo: {
      schedules: [
        { weekday: 1, startTime: '08:00', endTime: '12:00' },
        { weekday: 1, startTime: '11:00', endTime: '13:00' },
      ],
    },
    espera: 409,
    titulo: 'Franjas solapadas',
  });
  await pediatra.llamar('PATCH', '/api/v1/doctors/me', {
    cuerpo: { appointmentDurationMinutes: horario.appointmentDurationMinutes },
    espera: 200,
    titulo: 'Duración de la consulta',
  });
  await pediatra.llamar('PATCH', '/api/v1/doctors/me', {
    cuerpo: { appointmentDurationMinutes: 5 },
    espera: 400,
    titulo: 'Duración fuera de rango',
  });
  await paciente.llamar('GET', '/api/v1/doctors/me/schedules', {
    espera: 403,
    titulo: 'Un paciente no tiene franjas',
  });

  // ── Citas
  const cita = await paciente.llamar<Id>('POST', '/api/v1/appointments', {
    cuerpo: { doctorId: andres.id, startsAt: cupo.startsAt, reason: 'Control de crecimiento' },
    espera: 201,
    titulo: 'Agendar cita',
  });
  await pacienteDemo.llamar('POST', '/api/v1/appointments', {
    cuerpo: { doctorId: andres.id, startsAt: cupo.startsAt, reason: 'Consulta' },
    espera: 409,
    titulo: 'Cupo ya ocupado',
  });
  await pediatra.llamar('POST', '/api/v1/appointments', {
    cuerpo: { doctorId: andres.id, startsAt: cupo.startsAt },
    espera: 403,
    titulo: 'Un médico no agenda citas',
  });
  await paciente.llamar('GET', '/api/v1/appointments', {
    consulta: { scope: 'upcoming' },
    espera: 200,
    titulo: 'Próximas citas del paciente',
  });
  await pediatra.llamar('GET', '/api/v1/appointments', {
    consulta: { date: dia },
    espera: 200,
    titulo: 'Agenda del día del médico',
  });
  await paciente.llamar('GET', '/api/v1/appointments/{id}', {
    ids: { id: cita.id },
    espera: 200,
    titulo: 'Detalle visto por el paciente',
  });
  await pediatra.llamar('GET', '/api/v1/appointments/{id}', {
    ids: { id: cita.id },
    espera: 200,
    titulo: 'Detalle visto por el médico',
  });
  await pacienteDemo.llamar('GET', '/api/v1/appointments/{id}', {
    ids: { id: cita.id },
    espera: 403,
    titulo: 'Cita de otro paciente',
  });
  await paciente.llamar('PATCH', '/api/v1/appointments/{id}/confirm', {
    ids: { id: cita.id },
    espera: 200,
    titulo: 'Confirmar cita',
  });
  await paciente.llamar('PATCH', '/api/v1/appointments/{id}/confirm', {
    ids: { id: cita.id },
    espera: 409,
    titulo: 'Confirmar una cita ya confirmada',
  });
  await paciente.llamar('PATCH', '/api/v1/appointments/{id}/cancel', {
    ids: { id: cita.id },
    cuerpo: { reason: '' },
    espera: 400,
    titulo: 'Cancelar sin motivo',
  });
  await paciente.llamar('PATCH', '/api/v1/appointments/{id}/cancel', {
    ids: { id: cita.id },
    cuerpo: { reason: 'Viaje de trabajo' },
    espera: 200,
    titulo: 'Cancelar cita',
  });

  // Cita del paciente de demostración a menos de 24 h (los datos de demostración incluyen una).
  const proximas = await pacienteDemo.llamar<Pagina<Cita>>('GET', '/api/v1/appointments', {
    consulta: { scope: 'upcoming', pageSize: 50 },
    espera: 200,
    titulo: 'Próximas citas (paciente de demostración)',
  });
  const cercana = proximas.items.find(
    (c) => !c.canCancel && new Date(c.startsAt).getTime() - Date.now() < 86_400_000,
  );
  if (cercana)
    await pacienteDemo.llamar('PATCH', '/api/v1/appointments/{id}/cancel', {
      ids: { id: cercana.id },
      cuerpo: { reason: 'No puedo asistir' },
      espera: 403,
      titulo: 'Cancelar con menos de 24 h',
    });

  // Cita ya pasada de la médica, pendiente de registrar la atención.
  let porAtender: Cita | undefined;
  for (let pagina = 1; pagina <= 5 && !porAtender; pagina += 1) {
    const lista = await medica.llamar<Pagina<Cita>>('GET', '/api/v1/appointments', {
      consulta: { scope: 'history', page: pagina, pageSize: 50 },
      espera: 200,
      titulo: 'Historial de la médica',
    });
    porAtender = lista.items.find((c) => c.canComplete);
    if (pagina >= lista.totalPages) break;
  }
  if (!porAtender) throw new Error('No hay citas pasadas por atender');
  await medica.llamar('PATCH', '/api/v1/appointments/{id}/complete', {
    ids: { id: porAtender.id },
    cuerpo: { notes: 'Paciente estable. Se indica control en tres meses.' },
    espera: 200,
    titulo: 'Registrar atención',
  });
  await medica.llamar('PATCH', '/api/v1/appointments/{id}/complete', {
    ids: { id: porAtender.id },
    cuerpo: {},
    espera: 409,
    titulo: 'Cita ya atendida',
  });

  // ── Administración de usuarios
  await admin.llamar('GET', '/api/v1/users', {
    consulta: { role: 'DOCTOR' },
    espera: 200,
    titulo: 'Médicos registrados',
  });
  await pacienteDemo.llamar('GET', '/api/v1/users', {
    espera: 403,
    titulo: 'Un paciente no administra usuarios',
  });
  const nuevo = await admin.llamar<{ user: Id }>('POST', '/api/v1/users', {
    cuerpo: {
      role: 'DOCTOR',
      documentType: 'CC',
      documentNumber: '1067845210',
      firstName: 'Camila',
      lastName: 'Rojas',
      email: 'camila.rojas@medicitas.com',
      phone: '3109876543',
      specialtyId: pediatria.id,
      licenseNumber: 'RM-90123',
      appointmentDurationMinutes: 30,
    },
    espera: 201,
    titulo: 'Crear médico',
  });
  await admin.llamar('POST', '/api/v1/users', {
    cuerpo: {
      role: 'ADMIN',
      documentType: 'CC',
      documentNumber: '1067845211',
      firstName: 'Otro',
      lastName: 'Correo',
      email: 'camila.rojas@medicitas.com',
    },
    espera: 409,
    titulo: 'Correo ya registrado',
  });
  await admin.llamar('PATCH', '/api/v1/users/{id}', {
    ids: { id: nuevo.user.id },
    cuerpo: { phone: '3105556677', isActive: false },
    espera: 200,
    titulo: 'Cambiar teléfono y desactivar',
  });
  await admin.llamar('POST', '/api/v1/users/{id}/reset-password', {
    ids: { id: nuevo.user.id },
    espera: 200,
    titulo: 'Restablecer contraseña',
  });
  await admin.llamar('POST', '/api/v1/users/{id}/reset-password', {
    ids: { id: 999999 },
    espera: 404,
    titulo: 'Usuario inexistente',
  });

  // ── Notificaciones (la cita agendada y cancelada generó avisos)
  const avisos = await pediatra.llamar<Pagina<Id>>('GET', '/api/v1/notifications', {
    consulta: { unreadOnly: 'true' },
    espera: 200,
    titulo: 'Notificaciones sin leer del médico',
  });
  if (avisos.items[0])
    await pediatra.llamar('PATCH', '/api/v1/notifications/{id}/read', {
      ids: { id: avisos.items[0].id },
      espera: 204,
      titulo: 'Marcar como leída',
    });
  await pacienteDemo.llamar('PATCH', '/api/v1/notifications/{id}/read', {
    ids: { id: avisos.items[0]?.id ?? 1 },
    espera: 403,
    titulo: 'Notificación de otro usuario',
  });
  await pediatra.llamar('PATCH', '/api/v1/notifications/read-all', {
    espera: 200,
    titulo: 'Marcar todas como leídas',
  });

  // ── Panel y reportes
  await pacienteDemo.llamar('GET', '/api/v1/dashboard', {
    espera: 200,
    titulo: 'Panel del paciente',
  });
  await pediatra.llamar('GET', '/api/v1/dashboard', { espera: 200, titulo: 'Panel del médico' });
  await admin.llamar('GET', '/api/v1/dashboard', {
    espera: 200,
    titulo: 'Panel del administrador',
  });
  await admin.llamar('GET', '/api/v1/reports/appointments-by-specialty', {
    consulta: { from: fecha(new Date(hoy.getTime() - 30 * 86_400_000)), to: fecha(hoy) },
    espera: 200,
    titulo: 'Citas por especialidad, últimos 30 días',
  });

  // ── Cobertura: todos los endpoints del catálogo deben tener su respuesta exitosa.
  const sinEjemplo = ENDPOINTS.filter((e) => !ejemplos[`${e.metodo} ${e.ruta}`]?.[e.exito]);
  for (const e of sinEjemplo) console.log(`✗ Sin respuesta ${e.exito} para ${e.metodo} ${e.ruta}`);
  fallas += sinEjemplo.length;

  writeFileSync(
    SALIDA,
    JSON.stringify({ generado: new Date().toISOString(), api: API, ejemplos }, null, 2) + '\n',
  );
  console.log(
    `\n${llamadas} llamadas, ${ENDPOINTS.length - sinEjemplo.length}/${ENDPOINTS.length} endpoints cubiertos, ${fallas} fallas.`,
  );
  if (fallas > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
