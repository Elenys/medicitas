# 01 — Visión y alcance

## 1. El problema

Una clínica pequeña agenda sus citas por teléfono y en una agenda de papel o una hoja de cálculo.
Eso produce tres problemas concretos: el paciente solo puede agendar en horario de oficina, el
mismo cupo se asigna dos veces con frecuencia, y nadie sabe cuántas citas se cancelan ni en qué
especialidad.

## 2. La solución

MediCitas es una aplicación web donde el paciente consulta la disponibilidad real de cada médico
y reserva su cita en línea, el médico gestiona su agenda y registra la atención, y el
administrador supervisa la operación.

**Valor central del sistema:** el cálculo de cupos disponibles y la garantía de que un cupo no
se puede reservar dos veces. Todo lo demás está al servicio de eso.

## 3. Usuarios

| Perfil | Quién es | Su tarea principal |
|---|---|---|
| **Paciente** | Cualquier persona. Crea su propia cuenta | Reservar y gestionar sus citas |
| **Médico** | Profesional de la clínica. Su cuenta la crea el administrador | Definir su disponibilidad y atender su agenda |
| **Administrador** | Personal de la clínica | Crear médicos y supervisar la operación |

## 4. Alcance del MVP

### 4.1 Entra

**Autenticación y cuentas**
- Registro de paciente (autoservicio)
- Inicio y cierre de sesión con JWT en cookie `httpOnly`
- Cambio de contraseña propia desde el perfil
- Edición de datos del perfil

**Paciente**
- Panel con su próxima cita y un resumen
- Asistente de agendamiento en 3 pasos: especialidad y médico → fecha y hora → confirmación
- Calendario que marca los días con cupo disponible
- Selector de franjas horarias libres del día elegido
- Confirmar una cita reservada
- Cancelar una cita, indicando el motivo
- Listado de citas con pestañas *Próximas* / *Historial*, con paginación
- Detalle de una cita

**Médico**
- Agenda del día, ordenada por hora
- Configuración de horarios: días de la semana, franjas de atención y duración de la consulta
- Ver el detalle de una cita y los datos del paciente
- Registrar la atención (observaciones) y marcar la cita como completada
- Cancelar una cita asignada, indicando el motivo

**Administrador**
- Panel con 4 indicadores: citas de hoy, citas de la semana, canceladas del mes, pacientes registrados
- Gráfico de citas por especialidad
- Listado de usuarios con búsqueda y filtros por rol y estado
- Crear cuentas de médico y de administrador
- Activar y desactivar cuentas
- Restablecer la contraseña de un usuario (genera una temporal y la muestra en pantalla)
- Vista global de citas con filtros
- Cancelar cualquier cita

**Transversal**
- Notificaciones dentro de la aplicación: campana con contador y pantalla de avisos
- Interfaz responsiva desde 360 px
- Menús construidos según el rol de la sesión

### 4.2 No entra

Cada exclusión lleva la razón. Todas están descritas como funcionalidad existente en el manual
de usuario de `docs/`; la especificación las declara explícitamente fuera del MVP.

| Fuera del alcance | Razón |
|---|---|
| Envío real de correos | Requiere credenciales SMTP y un proveedor. El modelo de datos queda preparado |
| Notificaciones por WhatsApp | Requiere una cuenta de WhatsApp Business verificada. No es viable en el plazo |
| Recordatorios programados (24 h y 2 h antes) | Requiere un planificador de tareas corriendo de forma permanente |
| Activación de cuenta por correo | La cuenta queda activa al registrarse |
| Recuperación de contraseña por enlace | El administrador restablece la contraseña desde el panel |
| Bloqueo tras 5 intentos fallidos | Requiere registro de intentos y control de tiempo |
| Expiración de sesión por inactividad | El token dura 8 horas fijas |
| Reprogramar una cita | Se cancela y se agenda de nuevo, con el mismo resultado |
| Bloqueo de fechas del médico (vacaciones, incapacidad) | Arrastra la resolución de las citas ya asignadas en esas fechas |
| Consultorios y asignación de sala | No participa del caso de uso central |
| Agenda semanal y mensual del médico | La agenda diaria cubre la necesidad real |
| Exportación a PDF y Excel | Se puede añadir después sin tocar el modelo |
| Parámetros configurables del sistema | Son constantes en código, documentadas en un solo archivo |
| Plantillas de mensajes editables | Los textos se generan en código |
| Disponibilidad con WebSockets | La disponibilidad se revalida al confirmar, y el motor rechaza el choque |
| Historia clínica | Fuera del dominio del proyecto. Solo se guardan las observaciones de la cita |
| Pagos | Fuera del dominio del proyecto |
| Auditoría y bitácora de cambios | No se requiere para la demostración |
| Aplicación móvil nativa | La web es responsiva |
| Múltiples sedes | Una sola clínica |

### 4.3 Preparado para el futuro, no construido

El modelo de datos y la estructura del código dejan estos caminos abiertos sin implementarlos.
Se documentan para que la extensión no exija rediseñar:

- **Canal y estado de envío de la notificación**: la tabla `notifications` admite añadir
  `channel`, `delivery_status` y `sent_at` sin cambiar nada más. Con eso, un servicio de envío
  se conecta leyendo las notificaciones pendientes.
- **Tokens de un solo uso**: una tabla `verification_tokens` habilitaría activación de cuenta y
  recuperación de contraseña sin tocar `users`.
- **Ausencias del médico**: una tabla `doctor_absences` se intersectaría con el cálculo de cupos
  en un único punto del código (`lib/availability.ts`).
- **Consultorios**: una tabla `consulting_rooms` y una columna anulable en `appointments`.

## 5. Criterios de aceptación del MVP

El proyecto está terminado cuando, con los datos semilla cargados, se puede recorrer esto de
principio a fin sin tocar la base de datos a mano:

1. Un visitante se registra como paciente y entra a su panel.
2. Ese paciente agenda una cita eligiendo especialidad, médico, día y hora entre los cupos
   realmente libres.
3. La cita aparece en su panel y en la agenda del médico correspondiente.
4. Un segundo paciente **no puede** reservar el mismo cupo: la interfaz ya no lo ofrece, y si lo
   fuerza, la API responde con un error explícito.
5. El paciente confirma la cita y su estado cambia en ambas vistas.
6. El médico abre la cita, escribe las observaciones y la marca como completada.
7. La cita pasa al historial del paciente.
8. El paciente cancela otra cita con más de 24 horas de anticipación; el cupo vuelve a quedar
   disponible para otro paciente.
9. El paciente **no puede** cancelar una cita que ocurre dentro de las próximas 24 horas.
10. El administrador crea un médico nuevo, ese médico entra, configura sus horarios, y de
    inmediato aparece como disponible en el agendamiento.
11. El panel del administrador muestra indicadores coherentes con lo que acaba de ocurrir.
12. Todo lo anterior funciona en una ventana de 360 px de ancho.

## 6. Restricciones no funcionales

| Aspecto | Requisito |
|---|---|
| Navegador | Versiones actuales de Chrome, Firefox, Safari y Edge |
| Ancho mínimo | 360 px |
| Zona horaria | `America/Bogota` (UTC−5, sin horario de verano) |
| Idioma de la interfaz | Español |
| Accesibilidad | WCAG 2.1 AA: contraste, etiquetas asociadas, foco visible, navegación por teclado |
| Área táctil mínima | 48 × 48 px |
| Contraseñas | Nunca en texto plano; hash bcrypt con 10 rondas |
| Tiempo de respuesta | Menos de 500 ms en operaciones de lectura con los datos semilla |
| Instalación | `docker compose up` + `npm run dev`, sin pasos manuales adicionales |
