# 02 — Reglas de negocio

Cada regla tiene un identificador `RN-xx`. El código las referencia por ese número en los
comentarios y en los nombres de las pruebas.

---

## 1. Constantes del sistema

Viven en un único archivo, `src/lib/constants.ts`. Ningún valor de esta tabla puede aparecer
incrustado en la lógica.

| Constante | Valor | Regla que soporta |
|---|---|---|
| `CLINIC_TIMEZONE` | `'America/Bogota'` | RN-01 |
| `MIN_BOOKING_LEAD_HOURS` | `2` | RN-14 |
| `MAX_ADVANCE_BOOKING_DAYS` | `60` | RN-15 |
| `CANCELLATION_WINDOW_HOURS` | `24` | RN-24 |
| `PATIENT_APPOINTMENT_GAP_MINUTES` | `60` | RN-21.7 |
| `DEFAULT_APPOINTMENT_DURATION_MINUTES` | `30` | RN-09 |
| `MIN_APPOINTMENT_DURATION_MINUTES` | `10` | RN-09 |
| `MAX_APPOINTMENT_DURATION_MINUTES` | `120` | RN-09 |
| `MIN_PASSWORD_LENGTH` | `8` | RN-04 |
| `BCRYPT_ROUNDS` | `10` | RN-05 |
| `SESSION_DURATION_HOURS` | `8` | RN-06 |
| `DEFAULT_PAGE_SIZE` | `10` | RN-33 |
| `MAX_PAGE_SIZE` | `50` | RN-33 |

---

## 2. Tiempo y zona horaria

**RN-01.** Toda marca de tiempo se **almacena en UTC** (`TIMESTAMPTZ`) y se **presenta e
interpreta en `America/Bogota`**. Cuando el usuario elige "el 25 de septiembre a las 8:00", eso
significa las 8:00 de Bogotá.

**RN-02.** Los horarios del médico (`doctor_schedules`) se guardan como hora local de la clínica
(`TIME`, sin zona), porque describen una jornada recurrente, no un instante.

**RN-03.** El día de la semana se numera según ISO-8601: **1 = lunes … 7 = domingo**.

---

## 3. Cuentas y autenticación

**RN-04.** La contraseña tiene mínimo `MIN_PASSWORD_LENGTH` caracteres e incluye al menos una
minúscula, una mayúscula y un dígito.

**RN-05.** La contraseña se almacena siempre como hash bcrypt con `BCRYPT_ROUNDS` rondas. Nunca
se guarda, se registra ni se devuelve en texto plano.

**RN-06.** La sesión es un JWT firmado con `HS256`, guardado en una cookie `httpOnly`,
`sameSite=lax`, `secure` en producción, con vigencia de `SESSION_DURATION_HOURS`. El token lleva
`sub` (id de usuario), `role` y `exp`, y nada más.

**RN-07.** El correo electrónico es único en todo el sistema. La pareja
(tipo de documento, número de documento) también es única.

**RN-08.** Solo el rol `PATIENT` puede registrarse por sí mismo. Las cuentas `DOCTOR` y `ADMIN`
las crea un administrador.

**RN-08.1.** Al crear un usuario, el administrador no digita la contraseña: el sistema genera
una temporal, la guarda hasheada y la **muestra una sola vez en pantalla** para que el
administrador se la entregue al titular.

**RN-08.2.** Un usuario con `is_active = false` no puede iniciar sesión. Si su sesión está
abierta, la primera petición que haga es rechazada con `401`.

**RN-08.3.** Un usuario **nunca se elimina**, solo se desactiva, porque sus citas perderían
trazabilidad. La API no expone ninguna operación de borrado de usuarios.

**RN-08.4.** Un administrador no puede desactivarse a sí mismo.

---

## 4. Médicos y disponibilidad

**RN-09.** Cada médico define su `appointment_duration_minutes`, entre
`MIN_APPOINTMENT_DURATION_MINUTES` y `MAX_APPOINTMENT_DURATION_MINUTES`. Por omisión,
`DEFAULT_APPOINTMENT_DURATION_MINUTES`.

**RN-10.** Un horario (`doctor_schedule`) es una franja recurrente semanal: día de la semana,
hora de inicio y hora de fin. No tiene fecha de vigencia: aplica a todas las semanas.

**RN-11.** `end_time` debe ser posterior a `start_time`.

**RN-12.** Dos franjas del mismo médico y el mismo día **no pueden solaparse**. Un médico puede
tener varias franjas por día (por ejemplo, mañana y tarde) siempre que no se toquen.

**RN-13.** **Generación de cupos.** Los cupos de un médico para una fecha dada se calculan así.
Cada paso se referencia como `RN-13.n`:

| # | Paso |
|---|---|
| RN-13.1 | Se determina el día de la semana de la fecha, en zona `CLINIC_TIMEZONE` |
| RN-13.2 | Se toman todas las franjas de ese médico para ese día de la semana |
| RN-13.3 | Cada franja se divide en tramos consecutivos de `appointment_duration_minutes`, empezando en `start_time` |
| RN-13.4 | Un tramo solo se genera si **cabe completo** dentro de la franja. Una franja de 08:00 a 09:20 con duración 30 produce dos cupos (08:00 y 08:30); los 20 minutos sobrantes se descartan |
| RN-13.5 | Un cupo está **ocupado** si se solapa con alguna cita de ese médico en estado distinto de `CANCELLED` |
| RN-13.6 | Un cupo está **disponible** si no está ocupado y además cumple RN-14 y RN-15 |

**RN-14.** No se puede reservar un cupo que empieza dentro de las próximas
`MIN_BOOKING_LEAD_HOURS` horas.

**RN-15.** No se puede reservar un cupo que empieza después de `MAX_ADVANCE_BOOKING_DAYS` días
contados desde hoy.

**RN-16.** Un médico aparece como disponible al agendar solo si tiene **al menos una franja
configurada** y su cuenta está activa. Un médico sin horarios no se ofrece.

**RN-17.** Si un médico reduce o elimina una franja que ya tiene citas asignadas, **las citas
existentes no se alteran**: siguen en la agenda. El cambio solo afecta a los cupos futuros que
aún nadie reservó. La interfaz advierte cuántas citas quedan fuera de la nueva jornada.

---

## 5. Citas

### 5.1 Estados

```
                  ┌──────────────┐
   (reservar) ──► │    BOOKED    │
                  │  RESERVADA   │
                  └──────┬───────┘
                         │
          ┌──────────────┼───────────────┐
          │              │               │
    (confirmar)    (completar)      (cancelar)
          │              │               │
          ▼              │               ▼
  ┌──────────────┐       │        ┌──────────────┐
  │  CONFIRMED   │       │        │  CANCELLED   │
  │ CONFIRMADA   │       │        │  CANCELADA   │
  └──────┬───────┘       │        └──────────────┘
         │               │             terminal
   ┌─────┴─────┐         │
   │           │         │
(completar) (cancelar)   │
   │           │         │
   ▼           ▼         ▼
┌──────────────┐  ┌──────────────┐
│  COMPLETED   │  │  CANCELLED   │
│ COMPLETADA   │  │  CANCELADA   │
└──────────────┘  └──────────────┘
    terminal          terminal
```

| Estado | Etiqueta en la interfaz | Significado |
|---|---|---|
| `BOOKED` | Reservada | El cupo quedó separado |
| `CONFIRMED` | Confirmada | El paciente ratificó su asistencia |
| `COMPLETED` | Completada | El médico registró la atención |
| `CANCELLED` | Cancelada | La cita fue anulada; el cupo vuelve a quedar libre |

**RN-18.** `COMPLETED` y `CANCELLED` son estados **terminales**. Desde ellos no hay transición
posible.

**RN-19.** Toda transición no contemplada en el diagrama se rechaza con
`409 INVALID_STATE_TRANSITION`.

### 5.2 Reservar

**RN-20.** Solo un paciente reserva, y siempre para sí mismo. No existe agendamiento en nombre
de un tercero.

**RN-21.** Al reservar, el sistema valida en este orden. Cada verificación se referencia como
`RN-21.n`:

| # | Verificación |
|---|---|
| RN-21.1 | El médico existe, está activo y tiene horarios |
| RN-21.2 | `starts_at` corresponde exactamente al inicio de un cupo generado por RN-13 |
| RN-21.3 | Se cumplen RN-14 y RN-15 |
| RN-21.4 | `ends_at` = `starts_at` + `appointment_duration_minutes` del médico. **El cliente no envía `ends_at`**; lo calcula el servidor |
| RN-21.5 | El cupo no está ocupado por otra cita activa del médico |
| RN-21.6 | El paciente no tiene otra cita activa que se solape con ese horario |
| RN-21.7 | El paciente no tiene otra cita activa a menos de `PATIENT_APPOINTMENT_GAP_MINUTES` de distancia |

**RN-21.7.** Entre dos citas activas de un mismo paciente debe haber al menos
`PATIENT_APPOINTMENT_GAP_MINUTES` libres, **también cuando son con médicos distintos**: nadie
puede estar en dos consultorios casi a la misma hora. La separación se mide entre el fin de una
cita y el inicio de la otra; exactamente 60 minutos es válido, 59 no. Al rechazar se responde
`409 PATIENT_APPOINTMENT_TOO_CLOSE`.

**RN-21.8.** Por lo mismo, los cupos que caen dentro de ese margen se le presentan al paciente
como **no disponibles** (RN-13): la agenda propia del paciente se suma a la ocupación del médico
al generar los cupos, así que la interfaz nunca ofrece una hora que la reserva va a rechazar.

**RN-22.** Las verificaciones RN-21.5, RN-21.6 y RN-21.7 se garantizan además en la base de datos con
restricciones `EXCLUDE`, que ignoran las citas canceladas. Si dos peticiones llegan a la vez, el motor
rechaza una y la API responde `409 SLOT_TAKEN` (o `409 PATIENT_APPOINTMENT_TOO_CLOSE` cuando el
conflicto es el margen del paciente). **Esta es la garantía real**; la validación previa solo
sirve para dar un mensaje amable.

**RN-22.1.** El motivo de la consulta (`reason`) es opcional, máximo 255 caracteres.

### 5.3 Confirmar

**RN-23.** Solo el paciente titular confirma, y solo una cita en estado `BOOKED` cuya fecha de
inicio aún no haya pasado.

**RN-23.1.** No confirmar **no tiene consecuencia**: la cita sigue siendo válida en estado
`BOOKED` y el médico la ve igual en su agenda.

### 5.4 Cancelar

**RN-24.** Puede cancelar:

| Quién | Condición |
|---|---|
| El paciente titular | Solo si faltan más de `CANCELLATION_WINDOW_HOURS` horas para el inicio |
| El médico asignado | Siempre, mientras la cita no sea terminal |
| Un administrador | Siempre, mientras la cita no sea terminal |

**RN-24.1.** El motivo de cancelación (`cancellation_reason`) es **obligatorio**, entre 3 y 255
caracteres.

**RN-24.2.** Se registra quién canceló, en `cancelled_by_user_id`.

**RN-24.3.** Al cancelar, el cupo **vuelve a quedar disponible** de inmediato para cualquier
paciente.

**RN-24.4.** Si el paciente intenta cancelar dentro de la ventana de 24 horas, la API responde
`403 CANCELLATION_WINDOW_CLOSED` y la interfaz deshabilita el botón con la explicación visible.

### 5.5 Completar

**RN-25.** Solo el médico asignado completa la cita.

**RN-26.** Solo se puede completar una cita cuya hora de inicio **ya pasó**. No se puede cerrar
una atención que todavía no ocurrió.

**RN-27.** Al completar se guardan las observaciones (`notes`), opcionales, máximo 2000
caracteres. La cita pasa a `COMPLETED` y aparece en el historial del paciente.

---

## 6. Visibilidad de los datos

**RN-28.** Un paciente solo ve **sus propias** citas y su propio perfil. Cualquier intento de
acceder a otro recurso responde `403 FORBIDDEN`, nunca `404`, y sin filtrar información del
recurso ajeno.

**RN-29.** Un médico ve sus propias citas y, desde el detalle de una cita suya, los datos del
paciente de esa cita: nombre, documento, teléfono, fecha de nacimiento y género. No ve la
dirección ni pacientes con los que no tenga cita.

**RN-30.** Un administrador ve todos los usuarios y todas las citas. **No** puede completar una
cita, **ni escribir ni leer** las observaciones clínicas (`appointments.notes`): son competencia
exclusiva del médico que atendió y del paciente atendido. La API omite el campo `notes` en
cualquier respuesta dirigida a un administrador.

**RN-31.** La contraseña hasheada nunca sale de la capa de datos. Ninguna respuesta de la API
la incluye.

---

## 7. Notificaciones

**RN-32.** El sistema genera una notificación en estos eventos:

| Evento | Destinatario | Texto |
|---|---|---|
| Cita reservada | Paciente | Su cita con Dr(a). {médico} quedó reservada para el {fecha} a las {hora}. |
| Cita reservada | Médico | {paciente} reservó una cita para el {fecha} a las {hora}. |
| Cita confirmada | Médico | {paciente} confirmó su cita del {fecha} a las {hora}. |
| Cita cancelada | La contraparte de quien canceló | Su cita del {fecha} a las {hora} fue cancelada. Motivo: {motivo}. |
| Cita completada | Paciente | Su cita del {fecha} con Dr(a). {médico} fue registrada como atendida. |
| Cuenta creada | El titular | Su cuenta de {rol} fue creada. Cambie su contraseña al ingresar. |

**RN-32.1.** La notificación se crea **en la misma transacción** que el cambio que la origina.
Si el cambio falla, la notificación no existe.

**RN-32.2.** Las notificaciones se leen dentro de la aplicación. No se envían por ningún canal
externo en esta versión.

---

## 8. Listados

**RN-33.** Todo listado está paginado. Tamaño por omisión `DEFAULT_PAGE_SIZE`, máximo
`MAX_PAGE_SIZE`. La respuesta incluye `{ items, page, pageSize, total, totalPages }`.

**RN-34.** El listado de citas del paciente se divide en dos pestañas:
- **Próximas**: estado `BOOKED` o `CONFIRMED` con `starts_at >= ahora`, orden ascendente.
- **Historial**: todo lo demás (`COMPLETED`, `CANCELLED`, o pasadas), orden descendente.

**RN-35.** La agenda del médico muestra un solo día, ordenada por `starts_at` ascendente,
excluyendo las canceladas por omisión, con un interruptor para incluirlas.

---

## 9. Indicadores del panel de administración

**RN-36.** Los cuatro indicadores se calculan así, siempre en `CLINIC_TIMEZONE`:

| Indicador | Cálculo |
|---|---|
| Citas de hoy | Citas no canceladas cuyo `starts_at` cae en el día de hoy |
| Citas de la semana | Citas no canceladas entre el lunes y el domingo de la semana actual |
| Canceladas del mes | Citas en estado `CANCELLED` creadas dentro del mes actual |
| Pacientes registrados | Total de usuarios con rol `PATIENT` y cuenta activa |

**RN-37.** El gráfico de citas por especialidad cuenta las citas **no canceladas** agrupadas por
la especialidad del médico, dentro del rango de fechas seleccionado (por omisión, los últimos
30 días).

---

## 10. Casos de uso

| ID | Caso de uso | Actor | Reglas implicadas |
|---|---|---|---|
| CU-01 | Registrarse como paciente | Visitante | RN-04, RN-05, RN-07, RN-08 |
| CU-02 | Iniciar sesión | Los tres | RN-06, RN-08.2 |
| CU-03 | Cerrar sesión | Los tres | RN-06 |
| CU-04 | Editar el perfil propio | Los tres | RN-07 |
| CU-05 | Cambiar la contraseña propia | Los tres | RN-04, RN-05 |
| CU-06 | Consultar especialidades | Paciente | — |
| CU-07 | Consultar médicos de una especialidad | Paciente | RN-16 |
| CU-08 | Consultar días con disponibilidad | Paciente | RN-13, RN-14, RN-15 |
| CU-09 | Consultar cupos de un día | Paciente | RN-13, RN-14, RN-15 |
| CU-10 | Reservar una cita | Paciente | RN-20, RN-21, RN-21.7, RN-22, RN-32 |
| CU-11 | Confirmar una cita | Paciente | RN-19, RN-23, RN-32 |
| CU-12 | Cancelar una cita | Paciente, Médico, Admin | RN-19, RN-24, RN-32 |
| CU-13 | Consultar mis citas | Paciente | RN-28, RN-33, RN-34 |
| CU-14 | Ver el detalle de una cita | Paciente, Médico, Admin | RN-28, RN-29, RN-30 |
| CU-15 | Configurar mis horarios | Médico | RN-09, RN-10, RN-11, RN-12, RN-17 |
| CU-16 | Ver mi agenda del día | Médico | RN-29, RN-35 |
| CU-17 | Registrar la atención y completar | Médico | RN-25, RN-26, RN-27, RN-32 |
| CU-18 | Ver el panel de indicadores | Admin | RN-36 |
| CU-19 | Ver el reporte por especialidad | Admin | RN-37 |
| CU-20 | Listar y buscar usuarios | Admin | RN-33 |
| CU-21 | Crear un médico o administrador | Admin | RN-08, RN-08.1, RN-32 |
| CU-22 | Activar o desactivar una cuenta | Admin | RN-08.2, RN-08.3, RN-08.4 |
| CU-23 | Restablecer la contraseña de un usuario | Admin | RN-05, RN-08.1 |
| CU-24 | Ver la vista global de citas | Admin | RN-30, RN-33 |
| CU-25 | Consultar y marcar avisos como leídos | Los tres | RN-32 |
