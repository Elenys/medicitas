# 09 — Plan de implementación

Nueve fases. Cada una termina en un estado **verificable**: algo que se puede abrir, probar o
ejecutar. No hay fases que solo "preparan"; todas entregan algo comprobable.

El orden no es arbitrario. Va del centro hacia afuera: primero el dato, luego la regla que lo
gobierna, luego la API, y solo entonces la interfaz. Así, cuando aparece la primera pantalla, lo
que hay detrás ya está probado.

---

## Fase 1 — Cimientos

**Objetivo:** el proyecto arranca, se conecta a la base de datos y las herramientas de calidad
funcionan.

- [ ] `npx create-next-app` con TypeScript, Tailwind, App Router y alias `@/*`
- [ ] `docker-compose.yml` con PostgreSQL 16
- [ ] Prisma: instalación, `schema.prisma` inicial, conexión
- [ ] `.env.example`, `.env`, `.gitignore`, `.editorconfig`
- [ ] `src/lib/env.ts` — validación de variables con Zod al arrancar
- [ ] ESLint con las reglas de [07, §6](07-arquitectura-y-entorno.md) y Prettier
- [ ] Vitest configurado
- [ ] Scripts de `package.json`
- [ ] `git init`, rama `develop`, primer commit
- [ ] `README.md` con las instrucciones de puesta en marcha

**Verificación:** `npm run dev` levanta en `:3000`. `npm run verify` pasa. `docker compose up -d`
deja la base accesible.

---

## Fase 2 — Modelo de datos

**Objetivo:** el esquema completo existe, con sus restricciones probadas.

- [ ] `schema.prisma` con los 7 modelos y los 5 tipos enumerados de [03](03-modelo-de-datos.md)
- [ ] Migración inicial
- [ ] **Migración manual** con `CREATE EXTENSION btree_gist` y las dos restricciones `EXCLUDE`
- [ ] Los `CHECK` que Prisma no expresa, en la misma migración
- [ ] Triggers de `updated_at`
- [ ] `src/server/db.ts` — cliente Prisma único
- [ ] `prisma/seed.ts` con especialidades, usuarios y horarios
- [ ] `tests/integration/constraints.test.ts` — las 15 pruebas de [03, §7](03-modelo-de-datos.md)

**Verificación:** las 15 pruebas de restricciones pasan. En particular, las tres que el modelo
original no superaba: solapamiento parcial, reutilización tras cancelar y doble reserva del
paciente.

> Esta fase es la más importante del proyecto. Si las restricciones no quedan bien aquí, todo lo
> que se construya encima hereda el defecto.

---

## Fase 3 — Lógica de dominio

**Objetivo:** las reglas de negocio existen y están probadas, **sin una sola línea de interfaz**.

- [ ] `src/lib/constants.ts` — la tabla completa de [02, §1](02-reglas-de-negocio.md)
- [ ] `src/lib/datetime.ts` — conversiones y formatos
- [ ] `src/lib/availability.ts` — generación de cupos (RN-13)
- [ ] `src/lib/appointment-rules.ts` — transiciones y permisos (RN-18 a RN-26)
- [ ] `src/server/http/errors.ts` — las excepciones de dominio
- [ ] `src/lib/schemas/` — todos los esquemas Zod
- [ ] Pruebas unitarias de [08, §2](08-pruebas-y-datos-semilla.md)

**Verificación:** los 16 casos de generación de cupos, la matriz de transiciones y la de
permisos, todos en verde. Ninguna de estas pruebas necesita base de datos ni navegador.

---

## Fase 4 — Autenticación

**Objetivo:** se puede entrar y salir del sistema.

- [ ] `src/server/session.ts` — emisión y verificación del JWT con `jose`
- [ ] Hash con bcrypt
- [ ] `src/server/http/handler.ts` — envoltorio único de route handlers
- [ ] `src/server/services/auth.service.ts`
- [ ] Endpoints 1–4: registro, login, logout, `me`
- [ ] `middleware.ts` — protección y redirección por rol
- [ ] Endpoints 5–7: perfil y contraseña
- [ ] Pantallas `/login` y `/registro`
- [ ] `AppLayout`, `TopBar`, `SideMenu`, `MenuItem`, `PageContainer`, `AppFooter`
- [ ] Los componentes de `components/ui/` que estas pantallas necesitan
- [ ] `useAuth`, `useToast`
- [ ] `tests/integration/authorization.test.ts`

**Verificación:** un visitante se registra, entra, ve un panel vacío con el menú de su rol, y
sale. Con los tres roles de la semilla, cada uno ve un menú distinto. Sin sesión, `/paciente`
redirige a `/login`.

---

## Fase 5 — Agendamiento

**Objetivo:** el caso de uso central funciona de principio a fin.

Esta fase es el corazón del producto. Todo lo anterior existía para llegar aquí.

- [ ] `src/server/services/availability.service.ts`
- [ ] Endpoints 8–12: especialidades, médicos, disponibilidad, cupos
- [ ] `src/server/services/appointments.service.ts`
- [ ] Endpoints 16–18: listar, crear, detalle
- [ ] Manejo del código `23P01` de PostgreSQL → `409 SLOT_TAKEN`
- [ ] `useAvailability`, `useAvailableSlots`, `useAppointments`
- [ ] `StatusBadge`, `AppointmentCard`
- [ ] `AppointmentWizard`, `SpecialtySelector`, `DoctorList`, `AvailabilityCalendar`,
      `TimeSlotPicker`, `AppointmentSummary`
- [ ] Pantalla `/paciente/agendar`
- [ ] Pantalla `/paciente` (panel)
- [ ] `tests/integration/booking.test.ts` y `concurrency.test.ts`

**Verificación:** un paciente recorre los tres pasos y reserva. El cupo desaparece de la lista.
Un segundo paciente que intenta el mismo cupo recibe el mensaje correcto y vuelve al paso 2. La
prueba de concurrencia confirma que solo uno gana.

---

## Fase 6 — Ciclo de vida de la cita

**Objetivo:** las citas se confirman, se cancelan y se completan.

- [ ] Endpoints 19–21: confirmar, cancelar, completar
- [ ] Cálculo de `canConfirm` / `canCancel` / `canComplete` en el servidor
- [ ] `useAppointmentActions` con invalidación de caché
- [ ] `AppointmentList`, `Tabs`, `Pagination`, `EmptyState`, `ConfirmDialog`
- [ ] `CancelAppointmentDialog`
- [ ] Pantallas `/paciente/citas` y `/paciente/citas/[id]`
- [ ] Endpoints 13–15: horarios del médico
- [ ] `ScheduleEditor`, `ScheduleRow`, `DurationSelector`
- [ ] Pantallas `/medico`, `/medico/horarios`, `/medico/citas/[id]`
- [ ] `AttentionForm`

**Verificación:** el recorrido completo del guion de demostración, pasos 1 a 13. En particular:
cancelar libera el cupo; la cita de dentro de 12 horas no se puede cancelar; el médico solo
puede completar una cita cuya hora ya pasó.

---

## Fase 7 — Notificaciones

**Objetivo:** cada cambio genera su aviso y el usuario lo ve.

- [ ] `src/server/services/notifications.service.ts`
- [ ] Creación de notificaciones **dentro de la transacción** de cada acción (RN-32.1)
- [ ] Endpoints 26–28
- [ ] `useNotifications`
- [ ] `NotificationBell` en la barra superior
- [ ] `NotificationList` y pantalla `/avisos`

**Verificación:** al reservar, el paciente y el médico reciben su aviso. La campana muestra el
contador correcto. Marcar como leída lo actualiza sin recargar.

---

## Fase 8 — Administración

**Objetivo:** el administrador puede operar el sistema.

- [ ] `src/server/services/users.service.ts`
- [ ] Generación de contraseñas temporales
- [ ] Endpoints 22–25
- [ ] `src/server/services/reports.service.ts`
- [ ] Endpoints 29–30
- [ ] `UserTable`, `UserForm`, `TemporaryPasswordDialog`, `DataTable`
- [ ] `KpiCard`, `SpecialtyChart`
- [ ] Pantallas `/admin`, `/admin/usuarios`, `/admin/citas`, `/admin/reportes`
- [ ] Pantalla `/perfil`

**Verificación:** el administrador crea un médico, copia su contraseña temporal, ese médico
entra, configura horarios y de inmediato aparece disponible para agendar. Los indicadores
reflejan lo que acaba de ocurrir.

---

## Fase 9 — Acabado

**Objetivo:** el producto está terminado, no solo funcionando.

- [ ] Revisión responsiva de las 15 pantallas a 360, 768 y 1280 px
- [ ] Recorrido completo por teclado
- [ ] Verificación de contraste en los estados reales
- [ ] Los cuatro estados (cargando, con datos, vacío, error) en toda vista que consulta datos
- [ ] Revisión de todos los textos contra la tabla de [06, §7](06-sistema-de-diseno.md)
- [ ] Página 404 y página de error
- [ ] Datos semilla completos según [08, §4](08-pruebas-y-datos-semilla.md)
- [ ] `npm run verify` sin advertencias
- [ ] `README.md` definitivo
- [ ] Guion de demostración probado de punta a punta
- [ ] Fusión a `main` y etiqueta `v1.0.0`

**Verificación:** los 20 pasos del guion de demostración se ejecutan sin tocar la base de datos
a mano, en una ventana de 360 px y también en escritorio.

---

## Resumen

| Fase | Entrega | Riesgo |
|---|---|---|
| 1 | El proyecto arranca | Bajo |
| 2 | El esquema existe y sus reglas están probadas | **Alto** — las restricciones `EXCLUDE` son lo más delicado |
| 3 | Las reglas de negocio están probadas | **Alto** — el cálculo de cupos tiene muchos casos borde |
| 4 | Se puede entrar y salir | Medio |
| 5 | **Se puede agendar** | **Alto** — es el producto |
| 6 | La cita completa su ciclo | Medio |
| 7 | Hay avisos | Bajo |
| 8 | El sistema se administra | Bajo |
| 9 | El producto está terminado | Bajo |

Las fases 2, 3 y 5 concentran el riesgo. Las tres se pueden verificar con pruebas automáticas
antes de que exista una sola pantalla, que es exactamente por lo que están en ese orden.

---

## Si hay que recortar más

Si el tiempo se acorta, el orden para recortar es este, de lo más prescindible a lo menos:

1. El gráfico del panel administrativo (fase 8) — un número en un `KpiCard` cumple.
2. La pantalla de avisos (fase 7) — la campana con el contador basta.
3. La vista global de citas del administrador (fase 8).
4. El restablecimiento de contraseña por el administrador (fase 8).
5. El estado `CONFIRMED` (fase 6) — el ciclo funciona sin él.

**Nunca se recortan** las fases 2, 3 y 5. Sin ellas no hay producto, solo pantallas.
