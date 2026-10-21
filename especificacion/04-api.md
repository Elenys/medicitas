# 04 — API

REST sobre HTTP, implementada con Route Handlers de Next.js en `src/app/api/v1/…`.
Sustantivos en plural, `kebab-case`, versión al inicio de la ruta, la acción la expresa el método
HTTP — conforme al documento de estándares de codificación.

---

## 1. Convenciones

### 1.1 Formato

Peticiones y respuestas en `application/json`. Los cuerpos de entrada se validan con **Zod**
antes de llegar a la lógica de negocio; el esquema Zod cumple el papel del DTO con decoradores
que describe el estándar.

Las fechas viajan en **ISO-8601 con zona** (`2026-09-25T13:00:00.000Z`). Las fechas sin hora
viajan como `YYYY-MM-DD` e interpretan la zona `America/Bogota`.

### 1.2 Respuesta de error

Todas las respuestas de error tienen la misma forma:

```json
{
  "error": {
    "code": "SLOT_TAKEN",
    "message": "Ese horario acaba de ser reservado por otra persona. Elija otra franja.",
    "details": [
      { "field": "starts_at", "message": "El cupo no está disponible" }
    ]
  }
}
```

`message` está en español y va dirigido al usuario final. Nunca expone rutas, consultas ni
trazas (RN — manejo de errores del estándar). `details` solo aparece en errores de validación.

### 1.3 Catálogo de códigos de error

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | El cuerpo o los parámetros no pasan el esquema |
| `UNAUTHENTICATED` | 401 | No hay sesión, el token venció o la cuenta fue desactivada |
| `INVALID_CREDENTIALS` | 401 | Correo o contraseña incorrectos |
| `FORBIDDEN` | 403 | El rol no permite la operación, o el recurso es de otro usuario |
| `CANCELLATION_WINDOW_CLOSED` | 403 | El paciente intenta cancelar dentro de las 24 h |
| `NOT_FOUND` | 404 | El recurso no existe |
| `EMAIL_ALREADY_EXISTS` | 409 | El correo ya está registrado |
| `DOCUMENT_ALREADY_EXISTS` | 409 | El documento ya está registrado |
| `LICENSE_ALREADY_EXISTS` | 409 | La licencia profesional ya está registrada |
| `SLOT_TAKEN` | 409 | El cupo fue ocupado, por el médico o por el propio paciente |
| `PATIENT_APPOINTMENT_TOO_CLOSE` | 409 | El paciente ya tiene otra cita a menos de 60 min de ese horario (RN-21.7) |
| `INVALID_STATE_TRANSITION` | 409 | La transición de estado no está permitida |
| `SCHEDULE_OVERLAP` | 409 | Dos franjas del médico se solapan |
| `INTERNAL_ERROR` | 500 | Cualquier otra cosa. Se registra en el servidor con contexto |

**`INVALID_CREDENTIALS` no distingue** si el correo no existe o si la contraseña es incorrecta.

### 1.4 Autenticación

El JWT viaja en la cookie `medicitas_session` (`httpOnly`, `sameSite=lax`, `path=/`, `secure`
en producción). No se usa cabecera `Authorization`.

Un middleware resuelve la sesión antes de cada handler protegido y deja disponible
`{ userId, role }`. Si el usuario fue desactivado, se responde `401`.

### 1.5 Autorización

| Notación en la tabla | Significado |
|---|---|
| — | Público |
| `AUTH` | Cualquier usuario autenticado |
| `PATIENT` | Solo rol paciente |
| `DOCTOR` | Solo rol médico |
| `ADMIN` | Solo rol administrador |
| `OWNER` | Además, el recurso debe pertenecer al solicitante |

### 1.6 Paginación

Los listados aceptan `?page=1&pageSize=10` y responden:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "total": 47,
  "totalPages": 5
}
```

---

## 2. Índice de endpoints

| # | Método | Ruta | Permiso | Caso de uso |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/auth/register` | — | CU-01 |
| 2 | `POST` | `/api/v1/auth/login` | — | CU-02 |
| 3 | `POST` | `/api/v1/auth/logout` | `AUTH` | CU-03 |
| 4 | `GET` | `/api/v1/auth/me` | `AUTH` | CU-02 |
| 5 | `GET` | `/api/v1/profile` | `AUTH` | CU-04 |
| 6 | `PATCH` | `/api/v1/profile` | `AUTH` | CU-04 |
| 7 | `PATCH` | `/api/v1/profile/password` | `AUTH` | CU-05 |
| 8 | `GET` | `/api/v1/specialties` | `AUTH` | CU-06 |
| 9 | `GET` | `/api/v1/doctors` | `AUTH` | CU-07 |
| 10 | `GET` | `/api/v1/doctors/{id}` | `AUTH` | CU-07 |
| 11 | `GET` | `/api/v1/doctors/{id}/availability` | `AUTH` | CU-08 |
| 12 | `GET` | `/api/v1/doctors/{id}/available-slots` | `AUTH` | CU-09 |
| 13 | `GET` | `/api/v1/doctors/me/schedules` | `DOCTOR` | CU-15 |
| 14 | `PUT` | `/api/v1/doctors/me/schedules` | `DOCTOR` | CU-15 |
| 15 | `PATCH` | `/api/v1/doctors/me` | `DOCTOR` | CU-15 |
| 16 | `GET` | `/api/v1/appointments` | `AUTH` | CU-13, CU-16, CU-24 |
| 17 | `POST` | `/api/v1/appointments` | `PATIENT` | CU-10 |
| 18 | `GET` | `/api/v1/appointments/{id}` | `AUTH` `OWNER` | CU-14 |
| 19 | `PATCH` | `/api/v1/appointments/{id}/confirm` | `PATIENT` `OWNER` | CU-11 |
| 20 | `PATCH` | `/api/v1/appointments/{id}/cancel` | `AUTH` `OWNER` | CU-12 |
| 21 | `PATCH` | `/api/v1/appointments/{id}/complete` | `DOCTOR` `OWNER` | CU-17 |
| 22 | `GET` | `/api/v1/users` | `ADMIN` | CU-20 |
| 23 | `POST` | `/api/v1/users` | `ADMIN` | CU-21 |
| 24 | `PATCH` | `/api/v1/users/{id}` | `ADMIN` | CU-22 |
| 25 | `POST` | `/api/v1/users/{id}/reset-password` | `ADMIN` | CU-23 |
| 26 | `GET` | `/api/v1/notifications` | `AUTH` | CU-25 |
| 27 | `PATCH` | `/api/v1/notifications/{id}/read` | `AUTH` `OWNER` | CU-25 |
| 28 | `PATCH` | `/api/v1/notifications/read-all` | `AUTH` | CU-25 |
| 29 | `GET` | `/api/v1/dashboard` | `AUTH` | CU-18 |
| 30 | `GET` | `/api/v1/reports/appointments-by-specialty` | `ADMIN` | CU-19 |

---

## 3. Autenticación

### 1. `POST /api/v1/auth/register`

Registra un paciente. Público.

```json
{
  "documentType": "CC",
  "documentNumber": "1098765432",
  "firstName": "Laura",
  "lastName": "Gómez",
  "email": "laura.gomez@correo.com",
  "phone": "3001234567",
  "password": "Medicitas2026",
  "birthDate": "1995-04-17",
  "gender": "FEMALE",
  "address": "Carrera 7 # 32-10",
  "healthProvider": "Nueva EPS"
}
```

| Campo | Regla |
|---|---|
| `documentType` | Uno de `CC`, `TI`, `CE`, `PA` |
| `documentNumber` | 5–20 caracteres, solo dígitos y letras |
| `firstName`, `lastName` | 2–60 caracteres |
| `email` | Formato válido, máximo 150 |
| `phone` | Opcional, 7–15 dígitos |
| `password` | RN-04: mínimo 8, con minúscula, mayúscula y dígito |
| `birthDate` | Entre 1900-01-01 y hoy |
| `gender` | Uno de `FEMALE`, `MALE`, `OTHER` |
| `address`, `healthProvider` | Opcionales |

**201** — crea `users` + `patients` en una transacción, emite la cookie de sesión y devuelve el
usuario.
**409** — `EMAIL_ALREADY_EXISTS` o `DOCUMENT_ALREADY_EXISTS`.

### 2. `POST /api/v1/auth/login`

```json
{ "email": "laura.gomez@correo.com", "password": "Medicitas2026" }
```

**200** — emite la cookie y devuelve:

```json
{
  "id": 4,
  "role": "PATIENT",
  "firstName": "Laura",
  "lastName": "Gómez",
  "email": "laura.gomez@correo.com"
}
```

**401** — `INVALID_CREDENTIALS`, tanto si el correo no existe como si la contraseña es incorrecta
o la cuenta está desactivada.

### 3. `POST /api/v1/auth/logout`

**204** — borra la cookie.

### 4. `GET /api/v1/auth/me`

**200** — el usuario de la sesión, con su perfil anidado (`patient` o `doctor`) según el rol.
**401** — sin sesión válida.

---

## 4. Perfil

### 5. `GET /api/v1/profile`

Datos completos del usuario autenticado, incluyendo el perfil de paciente o de médico.

### 6. `PATCH /api/v1/profile`

Campos editables, todos opcionales:

| Rol | Puede editar |
|---|---|
| Todos | `firstName`, `lastName`, `phone` |
| `PATIENT` | además `address`, `healthProvider` |
| `DOCTOR` | además `appointmentDurationMinutes` |

`email`, `documentType` y `documentNumber` **no son editables**: identifican al usuario y su
historial. Enviarlos produce `400 VALIDATION_ERROR`.

### 7. `PATCH /api/v1/profile/password`

```json
{ "currentPassword": "Temporal2026", "newPassword": "Medicitas2026" }
```

**204**. **401** si `currentPassword` no coincide. La nueva contraseña cumple RN-04 y debe ser
distinta de la actual.

---

## 5. Catálogos y disponibilidad

### 8. `GET /api/v1/specialties`

Lista completa, sin paginar (son pocas). Ordenada por nombre.

```json
[{ "id": 1, "name": "Medicina General", "description": "Atención primaria y valoración inicial" }]
```

### 9. `GET /api/v1/doctors`

Parámetros: `specialtyId` (opcional), `page`, `pageSize`.

Devuelve **solo médicos activos con al menos una franja configurada** (RN-16):

```json
{
  "items": [
    {
      "id": 2,
      "fullName": "Andrés Ramírez",
      "specialty": { "id": 2, "name": "Pediatría" },
      "appointmentDurationMinutes": 20,
      "nextAvailableDate": "2026-09-22"
    }
  ],
  "page": 1, "pageSize": 10, "total": 3, "totalPages": 1
}
```

`nextAvailableDate` es la primera fecha con al menos un cupo libre dentro de los próximos
`MAX_ADVANCE_BOOKING_DAYS` días, o `null` si no hay ninguna.

### 10. `GET /api/v1/doctors/{id}`

Detalle del médico con sus franjas de atención.

### 11. `GET /api/v1/doctors/{id}/availability`

Alimenta el calendario del paso 2 del asistente.

Parámetros: `month=YYYY-MM` (obligatorio).

```json
{
  "month": "2026-09",
  "days": [
    { "date": "2026-09-22", "availableSlots": 6 },
    { "date": "2026-09-23", "availableSlots": 0 },
    { "date": "2026-09-24", "availableSlots": 14 }
  ]
}
```

Solo incluye los días del mes que están dentro de la ventana de RN-14 y RN-15. Los días con
`availableSlots: 0` se pintan deshabilitados.

### 12. `GET /api/v1/doctors/{id}/available-slots`

Alimenta el selector de horas.

Parámetros: `date=YYYY-MM-DD` (obligatorio).

```json
{
  "date": "2026-09-22",
  "durationMinutes": 20,
  "slots": [
    { "startsAt": "2026-09-22T13:00:00.000Z", "endsAt": "2026-09-22T13:20:00.000Z", "available": true },
    { "startsAt": "2026-09-22T13:20:00.000Z", "endsAt": "2026-09-22T13:40:00.000Z", "available": false }
  ]
}
```

Devuelve **todos** los cupos de la jornada, marcando cuáles están libres. Así la interfaz puede
mostrar los ocupados tachados, como describe el manual de usuario. Los cupos fuera de la ventana
de RN-14 / RN-15 no se incluyen.

---

## 6. Horarios del médico

### 13. `GET /api/v1/doctors/me/schedules`

```json
{
  "appointmentDurationMinutes": 20,
  "schedules": [
    { "id": 5, "weekday": 1, "startTime": "08:00", "endTime": "12:00" },
    { "id": 6, "weekday": 1, "startTime": "14:00", "endTime": "17:00" }
  ]
}
```

### 14. `PUT /api/v1/doctors/me/schedules`

Reemplaza **el conjunto completo** de franjas. Es un `PUT` y no un `PATCH` porque la pantalla
edita toda la semana de una vez; reemplazar evita la sincronización de altas, bajas y
modificaciones individuales.

```json
{
  "schedules": [
    { "weekday": 1, "startTime": "08:00", "endTime": "12:00" },
    { "weekday": 1, "startTime": "14:00", "endTime": "17:00" },
    { "weekday": 3, "startTime": "08:00", "endTime": "12:00" }
  ]
}
```

Validaciones: RN-11 (`endTime > startTime`) y RN-12 (sin solapamiento entre franjas del mismo
día) → `409 SCHEDULE_OVERLAP`.

**200** — devuelve el conjunto guardado, más una advertencia si hay citas futuras que quedan
fuera de la nueva jornada (RN-17):

```json
{
  "schedules": [],
  "warning": {
    "affectedAppointments": 2,
    "message": "2 citas ya agendadas quedan fuera de la nueva jornada. Se conservan y siguen en su agenda."
  }
}
```

Las citas **no se cancelan ni se mueven**.

### 15. `PATCH /api/v1/doctors/me`

```json
{ "appointmentDurationMinutes": 30 }
```

Entre 10 y 120 (RN-09). Cambiar la duración **no altera las citas ya agendadas**; solo afecta a
los cupos que se generen desde ese momento.

---

## 7. Citas

### 16. `GET /api/v1/appointments`

El alcance depende del rol, sin que el cliente pueda ampliarlo (RN-28 a RN-30):

| Rol | Ve |
|---|---|
| `PATIENT` | Solo sus propias citas |
| `DOCTOR` | Solo las citas donde es el médico asignado |
| `ADMIN` | Todas |

Parámetros:

| Parámetro | Valores | Uso |
|---|---|---|
| `scope` | `upcoming` \| `history` | Pestañas del paciente (RN-34) |
| `date` | `YYYY-MM-DD` | Agenda diaria del médico (RN-35) |
| `status` | `BOOKED` \| `CONFIRMED` \| `COMPLETED` \| `CANCELLED` | Filtro |
| `from`, `to` | `YYYY-MM-DD` | Rango, para la vista global del administrador |
| `doctorId`, `patientId` | entero | Solo `ADMIN` |
| `includeCancelled` | `true` \| `false` | Por omisión `false` en la agenda diaria |
| `page`, `pageSize` | | Paginación |

Respuesta paginada de:

```json
{
  "id": 17,
  "startsAt": "2026-09-22T13:00:00.000Z",
  "endsAt": "2026-09-22T13:20:00.000Z",
  "status": "BOOKED",
  "reason": "Control de rutina",
  "patient": { "id": 4, "fullName": "Laura Gómez" },
  "doctor": { "id": 2, "fullName": "Andrés Ramírez", "specialty": "Pediatría" },
  "canConfirm": true,
  "canCancel": true,
  "canComplete": false
}
```

Los tres campos `can*` los calcula el servidor aplicando RN-23 a RN-26 para el usuario de la
sesión. La interfaz solo los lee para habilitar botones; **nunca reimplementa esas reglas**.

### 17. `POST /api/v1/appointments`

```json
{
  "doctorId": 2,
  "startsAt": "2026-09-22T13:00:00.000Z",
  "reason": "Control de rutina"
}
```

El cliente **no envía `patientId`** (se toma de la sesión) ni **`endsAt`** (lo calcula el
servidor con la duración del médico) — RN-20, RN-21.4.

**201** — la cita creada.

| Error | Causa |
|---|---|
| `400 VALIDATION_ERROR` | `startsAt` no corresponde al inicio de un cupo válido |
| `403 FORBIDDEN` | El rol no es `PATIENT` |
| `404 NOT_FOUND` | El médico no existe o está inactivo |
| `409 SLOT_TAKEN` | El cupo está ocupado, por el médico o por el propio paciente |

`SLOT_TAKEN` se produce tanto por la comprobación previa como por el código `23P01` de
PostgreSQL. La segunda vía es la que garantiza la regla cuando dos peticiones llegan a la vez
(RN-22).

### 18. `GET /api/v1/appointments/{id}`

Detalle. El paciente ve los datos del médico; el médico ve además los datos del paciente
—documento, teléfono, fecha de nacimiento y género (RN-29)—; el administrador ve todo salvo las
observaciones clínicas (RN-30).

**403** si la cita no pertenece al solicitante.

### 19. `PATCH /api/v1/appointments/{id}/confirm`

Sin cuerpo. **200** con la cita actualizada.

| Error | Causa |
|---|---|
| `403 FORBIDDEN` | No es el paciente titular |
| `409 INVALID_STATE_TRANSITION` | La cita no está en `BOOKED`, o ya pasó |

### 20. `PATCH /api/v1/appointments/{id}/cancel`

```json
{ "reason": "Surgió un imprevisto laboral" }
```

`reason` obligatorio, 3–255 caracteres (RN-24.1).

| Error | Causa |
|---|---|
| `403 FORBIDDEN` | No es el paciente titular, el médico asignado ni un administrador |
| `403 CANCELLATION_WINDOW_CLOSED` | Es el paciente y faltan 24 h o menos |
| `409 INVALID_STATE_TRANSITION` | La cita ya es `COMPLETED` o `CANCELLED` |

En una transacción: cambia el estado, guarda `cancellation_reason` y `cancelled_by_user_id`, y
crea la notificación para la contraparte (RN-32.1).

### 21. `PATCH /api/v1/appointments/{id}/complete`

```json
{ "notes": "Paciente estable. Se indica control en tres meses." }
```

`notes` opcional, máximo 2000 caracteres.

| Error | Causa |
|---|---|
| `403 FORBIDDEN` | No es el médico asignado |
| `409 INVALID_STATE_TRANSITION` | La cita no está en `BOOKED` ni `CONFIRMED`, **o su hora de inicio todavía no ha pasado** (RN-26) |

---

## 8. Administración de usuarios

### 22. `GET /api/v1/users`

Parámetros: `role`, `isActive`, `q` (busca en nombre, apellido, correo y documento), `page`,
`pageSize`.

Nunca devuelve `passwordHash` (RN-31).

### 23. `POST /api/v1/users`

Crea un médico o un administrador.

```json
{
  "role": "DOCTOR",
  "documentType": "CC",
  "documentNumber": "79456123",
  "firstName": "Andrés",
  "lastName": "Ramírez",
  "email": "andres.ramirez@medicitas.com",
  "phone": "3109876543",
  "specialtyId": 2,
  "licenseNumber": "RM-45871",
  "appointmentDurationMinutes": 20
}
```

`specialtyId`, `licenseNumber` y `appointmentDurationMinutes` son obligatorios si
`role === "DOCTOR"` y se rechazan si `role === "ADMIN"`.

`role: "PATIENT"` se rechaza con `400`: los pacientes se registran solos (RN-08).

**201** — devuelve el usuario y, **una sola vez**, la contraseña temporal generada (RN-08.1):

```json
{
  "user": { "id": 9, "role": "DOCTOR", "email": "andres.ramirez@medicitas.com" },
  "temporaryPassword": "Med-7fK2pQ"
}
```

Esa contraseña no se puede recuperar después. La interfaz la muestra en un diálogo con un botón
de copiar y advierte que no volverá a mostrarse.

### 24. `PATCH /api/v1/users/{id}`

```json
{ "isActive": false }
```

Campos editables: `isActive`, `firstName`, `lastName`, `phone`, y para médicos `specialtyId` y
`appointmentDurationMinutes`.

**403** si el administrador intenta desactivarse a sí mismo (RN-08.4).

No existe `DELETE` sobre usuarios (RN-08.3).

### 25. `POST /api/v1/users/{id}/reset-password`

Sin cuerpo. Genera una contraseña temporal, la guarda hasheada y la devuelve una sola vez:

```json
{ "temporaryPassword": "Med-3xB9tR" }
```

---

## 9. Notificaciones

### 26. `GET /api/v1/notifications`

Solo las del usuario de la sesión. Parámetros: `unreadOnly`, `page`, `pageSize`.
Orden descendente por `createdAt`.

```json
{
  "items": [
    {
      "id": 31,
      "type": "APPOINTMENT_BOOKED",
      "message": "Su cita con Dr(a). Andrés Ramírez quedó reservada para el 22 de septiembre a las 8:00 a. m.",
      "appointmentId": 17,
      "readAt": null,
      "createdAt": "2026-09-18T15:22:10.000Z"
    }
  ],
  "unreadCount": 3,
  "page": 1, "pageSize": 10, "total": 12, "totalPages": 2
}
```

`unreadCount` viene en la misma respuesta para alimentar la campana sin una segunda petición.

### 27. `PATCH /api/v1/notifications/{id}/read`

**204**. **403** si la notificación es de otro usuario.

### 28. `PATCH /api/v1/notifications/read-all`

**200** — `{ "updated": 3 }`.

---

## 10. Panel y reportes

### 29. `GET /api/v1/dashboard`

Un solo endpoint que devuelve lo que corresponde al rol de la sesión.

**Paciente:**
```json
{
  "role": "PATIENT",
  "nextAppointment": { "id": 17, "startsAt": "...", "status": "BOOKED", "doctor": {} },
  "upcomingCount": 2,
  "completedCount": 8
}
```

**Médico:**
```json
{
  "role": "DOCTOR",
  "todayCount": 7,
  "pendingConfirmationCount": 2,
  "completedTodayCount": 3,
  "nextAppointment": {}
}
```

**Administrador** (RN-36):
```json
{
  "role": "ADMIN",
  "appointmentsToday": 24,
  "appointmentsThisWeek": 118,
  "cancelledThisMonth": 9,
  "registeredPatients": 76
}
```

### 30. `GET /api/v1/reports/appointments-by-specialty`

Parámetros: `from`, `to` (`YYYY-MM-DD`; por omisión, los últimos 30 días).

```json
{
  "from": "2026-08-19",
  "to": "2026-09-18",
  "items": [
    { "specialtyId": 1, "specialtyName": "Medicina General", "total": 42 },
    { "specialtyId": 2, "specialtyName": "Pediatría", "total": 31 }
  ]
}
```

Cuenta las citas **no canceladas** cuyo `startsAt` cae dentro del rango, agrupadas por la
especialidad del médico (RN-37).

---

## 11. Organización del código de la API

```
src/app/api/v1/
├── auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   ├── logout/route.ts
│   └── me/route.ts
├── profile/
│   ├── route.ts                    # GET, PATCH
│   └── password/route.ts           # PATCH
├── specialties/route.ts            # GET
├── doctors/
│   ├── route.ts                    # GET
│   ├── me/
│   │   ├── route.ts                # PATCH
│   │   └── schedules/route.ts      # GET, PUT
│   └── [id]/
│       ├── route.ts                # GET
│       ├── availability/route.ts   # GET
│       └── available-slots/route.ts# GET
├── appointments/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       ├── route.ts                # GET
│       ├── confirm/route.ts        # PATCH
│       ├── cancel/route.ts         # PATCH
│       └── complete/route.ts       # PATCH
├── users/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       ├── route.ts                # PATCH
│       └── reset-password/route.ts # POST
├── notifications/
│   ├── route.ts                    # GET
│   ├── read-all/route.ts           # PATCH
│   └── [id]/read/route.ts          # PATCH
├── dashboard/route.ts              # GET
└── reports/appointments-by-specialty/route.ts  # GET
```

El route handler **no contiene lógica de negocio**. Su trabajo es siempre el mismo y en este
orden:

1. Resolver la sesión y verificar el rol.
2. Validar entrada con el esquema Zod correspondiente.
3. Llamar al servicio de dominio en `src/server/services/`.
4. Serializar la respuesta.

Los errores se capturan en un envoltorio único (`src/server/http/handler.ts`) que traduce las
excepciones de dominio al catálogo de la sección 1.3. Ningún handler contiene `try/catch`
propio.
