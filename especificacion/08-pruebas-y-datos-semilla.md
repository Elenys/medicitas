# 08 — Pruebas y datos semilla

---

## 1. Criterio: qué se prueba

No se persigue un porcentaje de cobertura. Se prueba **donde está el riesgo real**, que en este
sistema son tres cosas:

1. **El cálculo de cupos disponibles** (RN-13). Es el núcleo del producto y el algoritmo con más
   casos borde: franjas que no dividen exactamente, varias franjas por día, cambios de duración.
2. **Las transiciones de estado y los permisos de la cita** (RN-18 a RN-26). Es donde una
   confusión produce un dato incorrecto que nadie nota.
3. **Las restricciones de la base de datos** (RN-22). Son la garantía del sistema; si no se
   prueban, no se sabe si están activas.

No se prueban: los componentes visuales sin lógica, los route handlers que solo delegan, ni el
propio ORM.

Herramienta: **Vitest**.

---

## 2. Pruebas unitarias

### 2.1 `lib/availability.test.ts` — generación de cupos

| # | Caso | Entrada | Esperado |
|---|---|---|---|
| 1 | Franja que divide exacto | 08:00–12:00, duración 30 | 8 cupos: 08:00 … 11:30 |
| 2 | Franja que **no** divide exacto | 08:00–09:20, duración 30 | **2 cupos** (08:00, 08:30). Los 20 min sobrantes se descartan |
| 3 | Dos franjas el mismo día | 08:00–12:00 y 14:00–17:00, duración 60 | 7 cupos, sin ninguno entre 12:00 y 14:00 |
| 4 | Día sin franjas | miércoles sin horario | 0 cupos |
| 5 | Franja más corta que la duración | 08:00–08:20, duración 30 | 0 cupos |
| 6 | Duración mínima | 08:00–09:00, duración 10 | 6 cupos |
| 7 | Duración máxima | 08:00–12:00, duración 120 | 2 cupos |
| 8 | Cupo ocupado por cita activa | cita `BOOKED` a las 09:00 | El cupo de 09:00 sale `available: false` |
| 9 | Cupo liberado por cancelación | cita `CANCELLED` a las 09:00 | El cupo de 09:00 sale `available: true` |
| 10 | Cita `COMPLETED` ocupa | cita `COMPLETED` a las 09:00 | `available: false` |
| 11 | Anticipación mínima | ahora 10:00, `MIN_BOOKING_LEAD_HOURS`=2 | Los cupos de hoy antes de las 12:00 no se ofrecen |
| 12 | Anticipación máxima | fecha a 61 días | 0 cupos |
| 13 | Límite exacto de 60 días | fecha a exactamente 60 días | Los cupos se ofrecen |
| 14 | Día de la semana ISO | domingo | Se consulta `weekday = 7`, no `0` |
| 15 | Zona horaria | franja 08:00 hora Bogotá | `startsAt` en UTC es `13:00Z` |
| 16 | Frontera de medianoche | franja 23:00–23:59 | No se desborda al día siguiente |

El caso **2** es el que fija la regla: un cupo solo se genera si cabe completo dentro de la
franja. El caso **9** es el que demuestra que el defecto del modelo original quedó corregido.

### 2.2 `lib/appointment-rules.test.ts` — transiciones y permisos

**Transiciones válidas:**

| Desde | Acción | Hacia | Resultado |
|---|---|---|---|
| `BOOKED` | confirmar | `CONFIRMED` | ✅ |
| `BOOKED` | cancelar | `CANCELLED` | ✅ |
| `BOOKED` | completar | `COMPLETED` | ✅ |
| `CONFIRMED` | cancelar | `CANCELLED` | ✅ |
| `CONFIRMED` | completar | `COMPLETED` | ✅ |
| `CONFIRMED` | confirmar | — | ❌ `INVALID_STATE_TRANSITION` |
| `COMPLETED` | cualquiera | — | ❌ terminal |
| `CANCELLED` | cualquiera | — | ❌ terminal |

**Permisos:**

| Acción | Paciente titular | Otro paciente | Médico asignado | Otro médico | Admin |
|---|---|---|---|---|---|
| Ver | ✅ | ❌ | ✅ | ❌ | ✅ |
| Confirmar | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cancelar | ✅ con 24 h | ❌ | ✅ | ❌ | ✅ |
| Completar | ❌ | ❌ | ✅ | ❌ | ❌ |

**Ventana de cancelación (RN-24):**

| # | Caso | Esperado |
|---|---|---|
| 1 | Paciente, faltan 25 h | Puede cancelar |
| 2 | Paciente, faltan exactamente 24 h | **No** puede — el límite es estricto |
| 3 | Paciente, faltan 23 h | No puede |
| 4 | Médico, faltan 23 h | Puede |
| 5 | Admin, faltan 1 h | Puede |
| 6 | Paciente, la cita ya pasó | No puede |

**Completar (RN-26):**

| # | Caso | Esperado |
|---|---|---|
| 1 | La hora de inicio ya pasó | Puede completar |
| 2 | La hora de inicio es futura | No puede |
| 3 | Justo en la hora de inicio | Puede |

### 2.3 `lib/datetime.test.ts`

Conversión Bogotá ↔ UTC en ambos sentidos, formatos de la tabla de [06, §8](06-sistema-de-diseno.md),
y cálculo del día de la semana ISO para fechas en los extremos del día.

### 2.4 `lib/schemas/*.test.ts`

Para cada esquema Zod, un caso válido y los casos de rechazo de cada regla: contraseña sin
mayúscula, correo malformado, fecha de nacimiento futura, duración fuera de rango, motivo de
cancelación demasiado corto.

---

## 3. Pruebas de integración

Contra una base de datos PostgreSQL real (`medicitas_test`), que se limpia entre pruebas.

> **Estado tras la construcción.** Se automatizaron §3.1 (restricciones, 8 casos) y §3.3
> (concurrencia) en `tests/integration/constraints.test.ts`; se ejecutan con
> `npm run test:integration` y crean y migran `medicitas_test` por sí solas. Los recorridos de
> §3.2 (reserva completa) y §3.4 (autorización) **no están automatizados**: se verificaron a
> mano contra la aplicación en Docker —reserva, `409 SLOT_TAKEN` para el mismo cupo, `401` sin
> sesión, `403` con rol equivocado, cuenta inactiva sin distinguir causa— y quedan como trabajo
> pendiente de automatización.

### 3.1 `tests/integration/constraints.test.ts`

Las 15 pruebas de la tabla de [03, §7](03-modelo-de-datos.md). Estas son las más importantes de
todo el proyecto: demuestran que las reglas están garantizadas por el motor y no solo por el
código.

Las tres que valen por sí solas:

```
✓ rechaza dos citas del mismo médico que se solapan parcialmente
   → el modelo original permitía 08:00–08:30 y 08:15–08:45

✓ permite reservar un cupo cuya cita anterior fue cancelada
   → el modelo original lo bloqueaba con la UNIQUE

✓ rechaza dos citas simultáneas del mismo paciente con médicos distintos
   → el modelo original no lo contemplaba
```

### 3.2 `tests/integration/booking.test.ts` — el recorrido completo

1. Registrar un paciente.
2. Consultar los cupos de un médico.
3. Reservar el primer cupo libre.
4. Verificar que ese cupo ya no aparece como disponible.
5. Un segundo paciente intenta el mismo cupo → `409 SLOT_TAKEN`.
6. Confirmar la cita.
7. El médico la marca como completada.
8. La cita aparece en el historial del paciente.
9. Se generaron las notificaciones correspondientes.

### 3.3 `tests/integration/concurrency.test.ts` — la prueba que importa

```ts
// Dos pacientes reservan el mismo cupo simultáneamente.
// Exactamente uno debe ganar. Si ganan los dos, el sistema está roto.
const [first, second] = await Promise.allSettled([
  bookAppointment(patientA, doctorId, slot),
  bookAppointment(patientB, doctorId, slot),
]);

const succeeded = [first, second].filter((r) => r.status === 'fulfilled');
expect(succeeded).toHaveLength(1);
```

Esta prueba es la única que distingue un sistema de citas correcto de uno que parece correcto.
Sin la restricción `EXCLUDE`, falla.

### 3.4 `tests/integration/authorization.test.ts`

Para cada endpoint protegido: sin sesión → `401`; con rol equivocado → `403`; con recurso ajeno
→ `403`. Y la comprobación de que ninguna respuesta contiene `passwordHash`.

---

## 4. Datos semilla

`prisma/seed.ts`. Idempotente: `npm run db:reset` deja siempre el mismo estado.

Las fechas se calculan **relativas a la fecha de ejecución**, nunca fijas, para que la
demostración funcione cualquier día.

### 4.1 Especialidades

| ID | Nombre | Descripción |
|---|---|---|
| 1 | Medicina General | Atención primaria y valoración inicial |
| 2 | Pediatría | Atención de niños y adolescentes |
| 3 | Ginecología | Salud femenina y reproductiva |
| 4 | Cardiología | Enfermedades del corazón y sistema circulatorio |
| 5 | Dermatología | Enfermedades de la piel |

Tomadas del script SQL de `docs/`.

### 4.2 Usuarios

Contraseña de todos: `Medicitas2026`.

| Rol | Correo | Nombre | Detalle |
|---|---|---|---|
| ADMIN | `admin@medicitas.com` | Carlas Montalvo | |
| ADMIN | `soporte@medicitas.com` | Freyder López | |
| DOCTOR | `laura.medina@medicitas.com` | Laura Medina | Medicina General, 30 min |
| DOCTOR | `andres.ramirez@medicitas.com` | Andrés Ramírez | Pediatría, 20 min |
| DOCTOR | `carolina.vega@medicitas.com` | Carolina Vega | Ginecología, 50 min |
| DOCTOR | `jorge.salazar@medicitas.com` | Jorge Salazar | Cardiología, 30 min |
| DOCTOR | `marta.ruiz@medicitas.com` | Marta Ruiz | Dermatología, 15 min |
| DOCTOR | `pedro.cano@medicitas.com` | Pedro Cano | Medicina General, **sin horarios** |
| PATIENT | `paciente@correo.com` | Sofía Herrera | El principal para la demostración |
| PATIENT | ×9 más | | Distintas edades y géneros |
| PATIENT | `inactivo@correo.com` | Diego Torres | **Cuenta desactivada** |

**Pedro Cano** y **Diego Torres** existen a propósito: demuestran que un médico sin horarios no
se ofrece al agendar (RN-16) y que una cuenta desactivada no puede entrar (RN-08.2). Un conjunto
de datos donde todo está bien no prueba nada.

### 4.3 Horarios

| Médico | Días | Franjas |
|---|---|---|
| Laura Medina | Lun–Vie | 07:00–12:00 y 14:00–18:00 |
| Andrés Ramírez | Lun, Mié, Vie | 08:00–12:00 |
| Carolina Vega | Mar, Jue | 09:00–13:00 |
| Jorge Salazar | Lun–Jue | 14:00–18:00 |
| Marta Ruiz | Lun–Sáb | 08:00–11:30 |
| Pedro Cano | — | ninguno |

Las duraciones están elegidas para que la semilla cubra los dos casos del cálculo de cupos
(RN-13.4):

| Médico | Franja | Duración | Cupos | Sobrante |
|---|---|---|---|---|
| Laura Medina | 07:00–12:00 + 14:00–18:00 | 30 min | 10 + 8 = 18 | 0 |
| Andrés Ramírez | 08:00–12:00 | 20 min | 12 | 0 |
| **Carolina Vega** | **09:00–13:00** | **50 min** | **4** | **40 min descartados** |
| Jorge Salazar | 14:00–18:00 | 30 min | 8 | 0 |
| Marta Ruiz | 08:00–11:30 | 15 min | 14 | 0 |

**Carolina Vega es el caso que importa**: su jornada de 240 minutos no es múltiplo de 50, así
que el sistema genera 4 cupos (09:00, 09:50, 10:40, 11:30) y descarta los últimos 40 minutos,
porque un quinto cupo terminaría a las 13:10 y se saldría de la franja. Sin ella, la semilla
solo demostraría el caso fácil.

### 4.4 Citas

Unas 40 citas repartidas así:

| Estado | Cantidad | Distribución |
|---|---|---|
| `COMPLETED` | 14 | Últimos 30 días, con observaciones escritas |
| `CANCELLED` | 6 | Últimos 30 días, con motivo |
| `BOOKED` | 10 | Próximos 14 días |
| `CONFIRMED` | 8 | Próximos 14 días |
| `BOOKED` | 2 | **Dentro de las próximas 24 h** |

Las dos últimas existen para demostrar RN-24.4: el paciente ve el botón de cancelar
deshabilitado con la explicación visible.

El paciente `paciente@correo.com` tiene al menos: una cita mañana en `BOOKED` (para confirmar),
una en `CONFIRMED` la semana entrante (para cancelar), una dentro de 12 horas (no cancelable),
y cinco `COMPLETED` en su historial.

Además hay citas ya pasadas en estado `BOOKED` asignadas a Laura Medina, para que pueda
demostrarse el registro de atención (RN-26) en cuanto se entre como ella.

### 4.5 Notificaciones

Se generan automáticamente al crear las citas semilla, con la misma lógica que en producción.
El paciente principal arranca con 3 avisos sin leer, para que la campana muestre su contador.

---

## 5. Guion de demostración

Diez minutos, con los datos semilla cargados. Sirve también como prueba manual de aceptación.

| # | Paso | Qué demuestra |
|---|---|---|
| 1 | Registrar un paciente nuevo | CU-01, validación de formulario |
| 2 | Agendar: elegir Pediatría → Andrés Ramírez | RN-16 — Pedro Cano no aparece |
| 3 | En el calendario, señalar los días sin cupo | RN-13 — solo lunes, miércoles y viernes |
| 4 | Elegir un día y ver las franjas ocupadas tachadas | RN-13 |
| 5 | Confirmar la reserva | CU-10 |
| 6 | En otra ventana, entrar como `paciente@correo.com` e intentar el mismo cupo | **RN-22 — el cupo ya no está** |
| 7 | Entrar como Andrés Ramírez y ver la cita en su agenda | CU-16 |
| 8 | Volver como paciente, confirmar la cita | CU-11 |
| 9 | Intentar cancelar la cita de dentro de 12 horas | **RN-24.4 — botón deshabilitado con explicación** |
| 10 | Cancelar la cita de la semana entrante | CU-12 |
| 11 | Volver a agendar en ese mismo cupo | **El cupo se liberó — lo que el modelo original impedía** |
| 12 | Como Laura Medina, atender una cita pasada y escribir observaciones | CU-17 |
| 13 | Como Laura Medina, cambiar la duración a 15 min y ver el cambio en los cupos | RN-09, RN-17 |
| 14 | Como administrador, ver los indicadores | CU-18 |
| 15 | Crear un médico y copiar su contraseña temporal | CU-21, RN-08.1 |
| 16 | Entrar con ese médico, configurar horarios | CU-15 |
| 17 | Como paciente, ver que el médico nuevo ya aparece disponible | RN-16 |
| 18 | Intentar entrar como `inactivo@correo.com` | RN-08.2 |
| 19 | Reducir la ventana del navegador a 360 px y repetir el paso 2 | Diseño responsivo |
| 20 | Recorrer el agendamiento solo con el teclado | Accesibilidad |

Los pasos **6**, **9** y **11** son los que demuestran que el sistema resuelve el problema real.
Los demás demuestran que está completo.
