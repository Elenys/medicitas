# 05 — Frontend

Next.js 15 con App Router, TypeScript estricto, Tailwind CSS.
Componentes de función, PascalCase, props tipadas con interfaz `…Props`, máximo 150 líneas por
componente — conforme al documento de estándares de codificación.

**Idioma:** identificadores y nombres de archivo en inglés; textos visibles en español.

---

## 1. Mapa de navegación

```
                          ┌─────────────┐
                          │   /login    │◄──── raíz redirige aquí sin sesión
                          └──────┬──────┘
                                 │
                          ┌──────┴──────┐
                          │ /registro   │
                          └──────┬──────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │ PATIENT          │ DOCTOR           │ ADMIN
              ▼                  ▼                  ▼
      ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
      │  /paciente    │  │   /medico     │  │    /admin     │
      │  Mi panel     │  │  Mi agenda    │  │  Panel        │
      └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
              │                  │                  │
   ┌──────────┼──────────┐       ├────────────┐     ├──────────────┐
   ▼          ▼          ▼       ▼            ▼     ▼              ▼
/agendar  /citas    /perfil  /horarios  /citas/[id] /usuarios  /citas
             │                                                     │
             ▼                                                  /reportes
        /citas/[id]

              Compartido por los tres perfiles:  /avisos   /perfil
```

### Rutas

| Ruta | Rol | Pantalla |
|---|---|---|
| `/` | — | Redirige a `/login` o al panel del rol |
| `/login` | — | Inicio de sesión |
| `/registro` | — | Registro de paciente |
| `/paciente` | `PATIENT` | Mi panel |
| `/paciente/agendar` | `PATIENT` | Asistente de agendamiento |
| `/paciente/citas` | `PATIENT` | Mis citas (pestañas) |
| `/paciente/citas/[id]` | `PATIENT` | Detalle de la cita |
| `/medico` | `DOCTOR` | Mi agenda del día |
| `/medico/horarios` | `DOCTOR` | Configuración de horarios |
| `/medico/citas/[id]` | `DOCTOR` | Detalle y registro de atención |
| `/admin` | `ADMIN` | Panel de indicadores |
| `/admin/usuarios` | `ADMIN` | Gestión de usuarios |
| `/admin/citas` | `ADMIN` | Vista global de citas |
| `/admin/reportes` | `ADMIN` | Reporte por especialidad |
| `/perfil` | `AUTH` | Mi perfil y contraseña |
| `/avisos` | `AUTH` | Notificaciones |

### Protección de rutas

Un `middleware.ts` en la raíz lee la cookie de sesión y actúa antes de que se renderice nada:

| Situación | Acción |
|---|---|
| Sin sesión en ruta protegida | Redirige a `/login?next=<ruta>` |
| Con sesión en `/login` o `/registro` | Redirige al panel del rol |
| Rol incorrecto para la ruta | Redirige al panel de su propio rol |
| En `/` | Redirige al panel del rol |

El middleware solo verifica la firma y la vigencia del token; la autorización fina vive en la
API (RN-28 a RN-30). **El cliente nunca es la única barrera.**

---

## 2. Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx                    # Raíz: fuentes, proveedores, <html lang="es">
│   ├── page.tsx                      # Redirección por rol
│   ├── globals.css
│   ├── (auth)/                       # Grupo sin AppLayout
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── registro/page.tsx
│   ├── (app)/                        # Grupo con AppLayout
│   │   ├── layout.tsx
│   │   ├── paciente/
│   │   │   ├── page.tsx
│   │   │   ├── agendar/page.tsx
│   │   │   └── citas/
│   │   │       ├── page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── medico/
│   │   │   ├── page.tsx
│   │   │   ├── horarios/page.tsx
│   │   │   └── citas/[id]/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── usuarios/page.tsx
│   │   │   ├── citas/page.tsx
│   │   │   └── reportes/page.tsx
│   │   ├── perfil/page.tsx
│   │   └── avisos/page.tsx
│   └── api/v1/…                      # Ver 04-api.md
├── components/
│   ├── layout/
│   ├── ui/
│   ├── appointments/
│   ├── schedules/
│   ├── users/
│   └── dashboard/
├── hooks/
├── lib/                              # Compartido cliente y servidor
│   ├── constants.ts
│   ├── datetime.ts
│   ├── availability.ts               # Núcleo: generación de cupos (RN-13)
│   ├── appointment-rules.ts          # Transiciones y permisos (RN-18 a RN-26)
│   ├── api-client.ts
│   └── schemas/                      # Esquemas Zod, compartidos por API y formularios
├── server/
│   ├── db.ts                         # Cliente Prisma
│   ├── session.ts                    # Emisión y verificación del JWT
│   ├── http/
│   │   ├── handler.ts                # Envoltorio y traducción de errores
│   │   └── errors.ts                 # Excepciones de dominio
│   └── services/
│       ├── auth.service.ts
│       ├── appointments.service.ts
│       ├── availability.service.ts
│       ├── schedules.service.ts
│       ├── users.service.ts
│       ├── notifications.service.ts
│       └── reports.service.ts
├── types/
└── middleware.ts
```

Los esquemas Zod de `lib/schemas/` los usan **tanto el formulario como el route handler**. Es la
única forma de que la validación del cliente y la del servidor no se separen con el tiempo.

---

## 3. Catálogo de componentes

Derivado del documento `Definicion Componentes Frontend.pdf`, recortado a lo que el MVP usa.
Se eliminaron los componentes de funcionalidades fuera del alcance: `BlockedDatesManager`,
`ReportChart` genérico, `DoctorAgendaWeek`, `Pagination` avanzada.

### 3.1 Estructura — `components/layout/`

| Componente | Props | Responsabilidad |
|---|---|---|
| `AppLayout` | `children` | Compone barra superior, menú lateral, contenedor y pie |
| `TopBar` | `user` | Logotipo, `NotificationBell`, menú de usuario |
| `SideMenu` | `role`, `isOpen`, `onClose` | Opciones de navegación según el rol. En móvil, panel deslizante |
| `MenuItem` | `href`, `icon`, `label`, `isActive` | Una opción, con su estado activo |
| `PageContainer` | `title`, `actions?`, `children` | Ancho máximo, título y espaciado uniformes |
| `AppFooter` | — | Versión y contacto de soporte |

`SideMenu` concentra toda la lógica de qué ve cada perfil. Es la razón por la que existe como
componente: si estuviera repartida, añadir una opción exigiría tocar tres archivos.

**Opciones por rol:**

| Paciente | Médico | Administrador |
|---|---|---|
| Inicio | Mi agenda | Panel |
| Agendar cita | Horarios | Usuarios |
| Mis citas | Mi perfil | Citas |
| Mi perfil | | Reportes |
| | | Mi perfil |

### 3.2 Interfaz — `components/ui/`

Sin conocimiento del dominio. Reutilizables en cualquier aplicación.

| Componente | Props principales | Notas |
|---|---|---|
| `Button` | `variant` (`primary`\|`secondary`\|`danger`\|`ghost`), `isLoading`, `disabled` | Altura mínima 48 px |
| `InputField` | `label`, `error`, `hint`, `required` | `<label htmlFor>` obligatorio, `aria-describedby` para el error |
| `SelectField` | `label`, `options`, `placeholder`, `error` | |
| `DateField` | `label`, `min`, `max`, `error` | Formato único en toda la aplicación |
| `TextArea` | `label`, `maxLength`, `error` | Contador de caracteres |
| `Card` | `title?`, `footer?`, `children` | Base visual de todo |
| `Badge` | `variant`, `children` | Genérico; `StatusBadge` lo especializa |
| `Tabs` | `tabs`, `activeKey`, `onChange` | Navegación por teclado con flechas |
| `Modal` | `isOpen`, `onClose`, `title` | Trampa de foco, cierre con `Esc` |
| `ConfirmDialog` | `title`, `message`, `confirmLabel`, `variant`, `onConfirm` | Para acciones irreversibles |
| `Alert` | `variant`, `title?`, `children` | `role="alert"` |
| `Toast` | — | Se usa vía `useToast`, no directamente |
| `Spinner` | `size` | `aria-label="Cargando"` |
| `EmptyState` | `icon`, `title`, `message`, `action?` | Una lista vacía sin explicación parece un error |
| `Pagination` | `page`, `totalPages`, `onChange` | |
| `DataTable` | `columns`, `rows`, `isLoading`, `emptyState` | En móvil colapsa a tarjetas apiladas |

### 3.3 Dominio — `components/appointments/`

| Componente | Props principales | Por qué existe |
|---|---|---|
| `StatusBadge` | `status` | El componente más repetido: 7 pantallas. Garantiza que cada estado tenga siempre el mismo color y el mismo texto |
| `AppointmentCard` | `appointment`, `viewerRole`, `onConfirm?`, `onCancel?`, `onComplete?`, `showActions?` | Se repite en el panel, en el listado y en la agenda del médico |
| `AppointmentList` | `scope`, `filters` | Agrupa el filtrado, la paginación y el estado vacío |
| `AppointmentWizard` | `onCompleted` | Contenedor de los 3 pasos. **Conserva el estado**, por eso es un componente y no tres páginas |
| `SpecialtySelector` | `value`, `onChange` | Paso 1a |
| `DoctorList` | `specialtyId`, `value`, `onChange` | Paso 1b. Muestra la primera fecha disponible de cada médico |
| `AvailabilityCalendar` | `doctorId`, `value`, `onChange` | Paso 2a. Concentra el cálculo de qué días tienen cupo |
| `TimeSlotPicker` | `doctorId`, `date`, `value`, `onChange` | Paso 2b. Muestra libres y ocupados |
| `AppointmentSummary` | `selection`, `onConfirm`, `isSubmitting` | Paso 3 |
| `CancelAppointmentDialog` | `appointment`, `onCancelled` | Pide el motivo, obligatorio |
| `AttentionForm` | `appointment`, `onCompleted` | Única pantalla donde el médico escribe información clínica |

**Regla de comunicación.** `AppointmentCard` **no llama a la API**. Avisa al padre con
`onCancel`, `onConfirm` y `onComplete`, y el padre decide. Esa es la razón por la que la misma
tarjeta sirve en el panel del paciente y en la agenda del médico, donde cancelar tiene otras
consecuencias.

### 3.4 Dominio — otras carpetas

| Componente | Carpeta | Propósito |
|---|---|---|
| `ScheduleEditor` | `schedules/` | Rejilla de 7 días con franjas; genera los cupos que consumirá el calendario |
| `ScheduleRow` | `schedules/` | Una franja: día, hora de inicio, hora de fin, eliminar |
| `DurationSelector` | `schedules/` | Duración de la consulta, 10–120 |
| `UserForm` | `users/` | Alta de médico o administrador. Concentra las validaciones de documento, correo y licencia |
| `UserTable` | `users/` | Listado con búsqueda y filtros |
| `TemporaryPasswordDialog` | `users/` | Muestra la contraseña generada una sola vez, con botón de copiar |
| `KpiCard` | `dashboard/` | Indicador numérico. Se repite 4 veces con estructura idéntica |
| `SpecialtyChart` | `dashboard/` | Gráfico de barras con Recharts. Encapsula la librería: se puede sustituir sin tocar la página |
| `NotificationBell` | `layout/` | Campana con el contador de avisos sin leer |
| `NotificationList` | `layout/` | Listado de avisos con marca de leído |

---

## 4. Hooks propios — `src/hooks/`

| Hook | Devuelve | Propósito |
|---|---|---|
| `useAuth()` | `{ user, isLoading, login, logout }` | Usuario y rol de la sesión. Lo consumen todos los componentes que deciden qué mostrar |
| `useAppointments(filters)` | `{ data, isLoading, error }` | Listado con TanStack Query. Evita repetir la llamada y el manejo de carga y error |
| `useAppointmentActions()` | `{ confirm, cancel, complete }` | Mutaciones con invalidación automática de la caché |
| `useAvailability(doctorId, month)` | `{ days, isLoading }` | Días con cupo, para el calendario |
| `useAvailableSlots(doctorId, date)` | `{ slots, isLoading }` | Franjas de un día, para el selector |
| `useNotifications()` | `{ items, unreadCount, markRead, markAllRead }` | Alimenta la campana y la pantalla de avisos |
| `useToast()` | `{ showSuccess, showError }` | Mensajes desde cualquier componente, sin pasar funciones por la jerarquía |
| `useMediaQuery(query)` | `boolean` | Ajusta el comportamiento del menú lateral |

### Política de caché (TanStack Query)

| Consulta | `staleTime` | Se invalida al |
|---|---|---|
| `specialties` | 1 hora | Nunca (catálogo fijo) |
| `doctors` | 5 minutos | Cambiar horarios |
| `availability`, `available-slots` | **0** | Reservar o cancelar cualquier cita |
| `appointments` | 30 segundos | Cualquier acción sobre citas |
| `notifications` | 30 segundos | Marcar como leída |
| `dashboard` | 1 minuto | Cualquier acción sobre citas |

La disponibilidad tiene `staleTime: 0` a propósito: es el dato que más cambia y el que peor
envejece. Es también la razón por la que el sistema no necesita WebSockets — se vuelve a
consultar al entrar al paso 2, y el motor garantiza el resto (RN-22).

---

## 5. Pantallas

### 5.1 Inicio de sesión — `/login`

Tarjeta centrada sobre fondo gris.

Campos: correo, contraseña con botón de mostrar/ocultar. Botón **Ingresar**. Enlace
**Crear cuenta**.

Componentes: `InputField`, `Button`, `Alert`, `Spinner`.

Errores: un `Alert` de variante error sobre el formulario, con el mensaje
"Correo o contraseña incorrectos".

### 5.2 Registro — `/registro`

Formulario en dos columnas en escritorio, una en móvil.

| Sección | Campos |
|---|---|
| Identificación | Tipo de documento, número de documento |
| Datos personales | Nombres, apellidos, fecha de nacimiento, género |
| Contacto | Correo, teléfono |
| Opcional | Dirección, EPS |
| Seguridad | Contraseña, confirmar contraseña |

Validación con React Hook Form + el esquema Zod compartido con la API. Los errores aparecen bajo
cada campo; los conflictos (`EMAIL_ALREADY_EXISTS`) como `Alert` arriba.

### 5.3 Mi panel — `/paciente`

```
┌──────────────────────────────────────────────┐
│  Hola, Laura            [+ Agendar cita]     │
├──────────────────────────────────────────────┤
│  PRÓXIMA CITA                                │
│  ┌────────────────────────────────────────┐  │
│  │ AppointmentCard (destacada)            │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  [KpiCard: 2 próximas]  [KpiCard: 8 atend.]  │
├──────────────────────────────────────────────┤
│  PRÓXIMAS CITAS                              │
│  AppointmentCard · AppointmentCard           │
│                        [Ver todas mis citas] │
└──────────────────────────────────────────────┘
```

`AppointmentCard` aparece dos veces —destacada y dentro del listado— con el mismo componente.
Es la justificación más clara de por qué se extrajo.

Sin citas: `EmptyState` con acción **Agendar mi primera cita**.

### 5.4 Agendar cita — `/paciente/agendar`

Asistente de 3 pasos con indicador de progreso. El estado vive en `AppointmentWizard`, nunca en
los pasos, de modo que **Atrás** no pierde nada.

**Paso 1 — Especialidad y médico**
`SpecialtySelector` (tarjetas seleccionables) → al elegir, aparece `DoctorList` con el nombre,
la especialidad, la duración de consulta y la primera fecha disponible de cada médico.

**Paso 2 — Fecha y hora**
`AvailabilityCalendar`: mes navegable, días con cupo en verde, sin cupo deshabilitados, fuera de
la ventana de 60 días atenuados. Al elegir un día aparece `TimeSlotPicker` con todas las franjas
de la jornada; las ocupadas se muestran tachadas y no son pulsables.

**Paso 3 — Confirmación**
`AppointmentSummary` con médico, especialidad, fecha, hora y duración, más un campo de texto
para el motivo (opcional). Botón **Confirmar cita**.

Si la reserva devuelve `409 SLOT_TAKEN`, el asistente vuelve al paso 2, refresca los cupos y
muestra un `Alert`: "Ese horario acaba de ser reservado por otra persona. Elija otra franja."
Esto es exactamente lo que describe el manual de usuario y lo que hace innecesarios los
WebSockets.

### 5.5 Mis citas — `/paciente/citas`

`Tabs` con **Próximas** e **Historial**. Cada pestaña es un `AppointmentList` con
`AppointmentCard`, `Pagination` y `EmptyState`.

Acciones por tarjeta, habilitadas según los campos `canConfirm` / `canCancel` que envía la API:

| Estado | Acciones |
|---|---|
| Reservada | Confirmar · Cancelar · Ver detalle |
| Confirmada | Cancelar · Ver detalle |
| Completada / Cancelada | Ver detalle |

Si `canCancel` es falso por la ventana de 24 horas, el botón aparece deshabilitado con un texto
explicativo visible —no solo un `title`— para cumplir accesibilidad.

### 5.6 Detalle de la cita — `/paciente/citas/[id]`

`Card` con todos los datos, `StatusBadge`, motivo de la consulta, y si está cancelada, el motivo
y quién canceló. Si está completada, las observaciones del médico.

### 5.7 Mi agenda — `/medico`

Selector de fecha (por omisión, hoy) con botones **Anterior**, **Hoy** y **Siguiente**.
Interruptor **Mostrar canceladas**, apagado por omisión.

Lista cronológica de `AppointmentCard` con la hora destacada a la izquierda. Acciones:
**Atender** (si la hora de inicio ya pasó) y **Cancelar**.

Encabezado con tres `KpiCard`: citas de hoy, pendientes de confirmar, atendidas hoy.

Sin citas: `EmptyState` "No tiene citas para este día".

### 5.8 Horarios — `/medico/horarios`

`DurationSelector` arriba. Luego `ScheduleEditor`: una fila por día de la semana, cada una con
sus franjas (`ScheduleRow`) y un botón **+ Agregar franja**.

Al guardar, si hay citas futuras fuera de la nueva jornada, un `Alert` informativo: *"2 citas ya
agendadas quedan fuera de la nueva jornada. Se conservan y siguen en su agenda."* No se cancela
nada (RN-17).

Vista previa en texto: *"Con esta configuración usted ofrece 46 cupos por semana."*

### 5.9 Atención — `/medico/citas/[id]`

Dos columnas en escritorio:

- **Izquierda**: datos del paciente (nombre, documento, edad, género, teléfono) e historial de
  citas anteriores con ese médico.
- **Derecha**: motivo de la consulta y `AttentionForm` con el área de observaciones y el botón
  **Marcar como completada**, dentro de un `ConfirmDialog`.

Si la cita aún no ha empezado, el botón está deshabilitado con la explicación visible (RN-26).

### 5.10 Panel administrativo — `/admin`

Cuatro `KpiCard` en rejilla (2×2 en móvil, 4×1 en escritorio) y debajo `SpecialtyChart`.

### 5.11 Usuarios — `/admin/usuarios`

Barra de búsqueda, filtros por rol y por estado, botón **+ Nuevo usuario**.
`UserTable` con nombre, correo, rol, especialidad, estado y acciones.

Acciones: **Editar** · **Activar/Desactivar** (con `ConfirmDialog`) · **Restablecer contraseña**
(con `ConfirmDialog`, luego `TemporaryPasswordDialog`).

`UserForm` en un `Modal`. Al elegir rol **Médico** aparecen los campos de especialidad, licencia
y duración; al elegir **Administrador** desaparecen.

No hay acción de eliminar (RN-08.3).

### 5.12 Citas — `/admin/citas`

`DataTable` con filtros de rango de fechas, estado, médico y paciente. Acción: **Cancelar**.

### 5.13 Reportes — `/admin/reportes`

Dos `DateField` de rango, botón **Generar**, `SpecialtyChart` y una tabla con los mismos datos
—porque un gráfico sin su tabla no es accesible para un lector de pantalla.

### 5.14 Mi perfil — `/perfil`

`Tabs` con **Datos personales** y **Seguridad**.

Datos: campos editables según el rol. Correo y documento se muestran deshabilitados con la nota
*"El número de documento no es editable porque identifica su historial. Si tiene un error,
solicite la corrección al administrador."*

Seguridad: contraseña actual, nueva y confirmación.

### 5.15 Avisos — `/avisos`

`NotificationList` con las no leídas destacadas, botón **Marcar todas como leídas**, y cada
aviso enlazando a la cita que lo originó cuando la tiene.

---

## 6. Comportamiento responsivo

| Ancho | Menú lateral | Rejillas | Tablas |
|---|---|---|---|
| < 768 px | Oculto; se abre con el botón de tres líneas | 1 columna | Tarjetas apiladas |
| 768–1024 px | Visible, colapsado a iconos | 2 columnas | Tabla con desplazamiento horizontal |
| > 1024 px | Visible completo | 3–4 columnas | Tabla completa |

El asistente de agendamiento es la pantalla más exigente en móvil: el calendario ocupa el ancho
completo y las franjas horarias se presentan en una rejilla de 3 columnas con botones de 48 px
de alto.

---

## 7. Estados de la interfaz

Toda vista que consulta datos contempla los cuatro estados. Ninguno se omite:

| Estado | Qué se muestra |
|---|---|
| Cargando | `Spinner` o esqueleto con la forma del contenido |
| Con datos | El contenido |
| Vacío | `EmptyState` con explicación y, cuando aplica, una acción |
| Error | `Alert` con el mensaje de la API y un botón **Reintentar** |

Toda acción que modifica datos deshabilita su botón mientras está en curso (`isLoading`) y
confirma el resultado con un `Toast`.
