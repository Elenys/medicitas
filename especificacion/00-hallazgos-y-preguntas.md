# MediCitas — Hallazgos de la documentación y preguntas abiertas

> **Estado: cerrado.** Las preguntas de la sección 5 fueron respondidas y las decisiones están
> recogidas en el [README](README.md) y desarrolladas en los documentos 01 a 09.
> Este archivo se conserva como registro del análisis crítico de `docs/`: explica *por qué* la
> especificación se aparta de la documentación original en cada punto.
>
> Fecha de análisis: 2026-09-18.
> Insumo: 25 archivos en `docs/` (PDF, DOCX, PNG, SQL).

## Resolución

| Pregunta | Decisión | Dónde se desarrolla |
|---|---|---|
| A1 — Motor de base de datos | **PostgreSQL 16** | [03](03-modelo-de-datos.md) |
| A2 — Backend | **Next.js completo**, API en Route Handlers | [07, §1](07-arquitectura-y-entorno.md) |
| A3 — Despliegue | **Solo local**, Docker Compose | [07, §4 y §10](07-arquitectura-y-entorno.md) |
| B — Recorte de alcance | Aceptado, con los ajustes de abajo | [01, §4](01-vision-y-alcance.md) |
| B — Notificaciones | **Solo dentro de la app**; envío externo = trabajo futuro | [01, §4.3](01-vision-y-alcance.md) |
| B — Autenticación | Sin correos; contraseña desde el perfil o reseteada por el admin | [02, §3](02-reglas-de-negocio.md) |
| B — Panel admin | Indicadores + usuarios + 1 gráfico | [01, §4.1](01-vision-y-alcance.md) |
| C1 — Confirmación | El paciente confirma; no confirmar no tiene consecuencia | RN-23 |
| C2 — Ventana de cancelación | **24 h**, como constante en código | RN-24 |
| C3 — Cancelación por médico/admin | Ambos pueden, sin ventana | RN-24 |
| C4 — Inasistencia | 4 estados, sin `NO_ASISTIO` | RN-18 |
| C5 — Generación de cupos | Confirmado tal como se planteó | RN-13 |
| C6 — Ventana de agendamiento | 60 días máximo, 2 horas mínimo | RN-14, RN-15 |
| C7 — Solapamiento del paciente | Se impide, en el motor | RN-21.6, RN-22 |
| C8 — Límite de citas activas | Sin límite | — |
| C9 — Cuenta del médico | La crea el admin, con contraseña temporal | RN-08.1 |
| C10 — Datos del paciente | Fecha de nacimiento y género obligatorios; dirección y EPS opcionales | [04, §3](04-api.md) |
| C11 — Zona horaria | `America/Bogota`, almacenado en UTC | RN-01 |
| D1 — Idioma del esquema | **Inglés**, con tabla de equivalencias | [03, §8](03-modelo-de-datos.md) |
| D2 — Estructura del repositorio | Adaptada a un solo proyecto | [07, §2](07-arquitectura-y-entorno.md) |
| D3 — Verde en la paleta | Se añade `#2E7D32` como color de éxito | [06, §1.1](06-sistema-de-diseno.md) |
| D4 — Idioma de la interfaz | Español | [07, §6](07-arquitectura-y-entorno.md) |
| E1 — Datos de demostración | Sí, con casos que fallan a propósito | [08, §4](08-pruebas-y-datos-semilla.md) |
| E2 — Pruebas | Cupos, transiciones y restricciones de BD | [08](08-pruebas-y-datos-semilla.md) |
| E3 — Formato | Markdown técnico, dividido por área | Esta carpeta |

**Pendiente de tu confirmación:** si la rúbrica del proyecto formativo exige alguna de las
funcionalidades excluidas (pregunta B1), avísame y la reincorporamos.

---

## 1. Qué dice hoy la documentación (resumen ejecutable)

**Producto.** MediCitas: sistema web de gestión de citas médicas para clínicas y consultorios.
Tres perfiles: **Paciente**, **Médico**, **Administrador**.

**Ciclo de vida de la cita.** `RESERVADA → CONFIRMADA → COMPLETADA`, con `CANCELADA` como
salida desde los dos primeros estados.

**Stack declarado** (informe técnico de plan de trabajo y estándares de codificación):

| Capa | Tecnología |
|---|---|
| Frontend | React con Next.js + Tailwind CSS |
| Backend | Node.js con NestJS |
| Base de datos | PostgreSQL |
| Seguridad | JWT + control de acceso por roles |
| Infraestructura | Nube (AWS o Azure) |
| Externos | API de correo y **WhatsApp** |
| Repositorio | GitHub, monorepo `/frontend` `/backend` `/docs` `/database` |

**Modelo de datos** (`GA6-220501096-AA2-EV02` + `Diagrama_ER_MediCitas.png`): 9 tablas en
**MySQL 8.0** — `roles`, `usuarios`, `especialidades`, `pacientes`, `medicos`, `consultorios`,
`horarios_medico`, `citas`, `notificaciones`.

**Librerías de frontend definidas**: Next.js, Tailwind, React Hook Form, TanStack Query,
Recharts, date-fns, lucide-react. Catálogo de ~40 componentes y 5 hooks propios.

**Paleta**: Azul `#1E88E5`, Gris `#F5F5F5` / `#333333`, Rojo `#E53935`.
Breakpoint móvil base 360×800; touch target mínimo 48×48; WCAG 2.1 AA.

---

## 2. Contradicciones detectadas

Estas son diferencias reales entre documentos, no matices. Cada una necesita una decisión.

### C1 — Motor de base de datos: PostgreSQL vs MySQL vs otro

| Fuente | Dice |
|---|---|
| `Informe tecnico Plan de Trabajo.pdf` | PostgreSQL |
| `Estandares de Codificacion.pdf` | PostgreSQL |
| `GA6-...Estructura_BD_MediCitas.docx` + diagrama ER | **MySQL 8.0** (usa `AUTO_INCREMENT`, `ENUM`, `InnoDB`, `utf8mb4`) |
| `GA10-...AA5...Configuracion_Servicios.pdf` | MySQL en Docker |
| `gemini-code-1789416931791.sql` | PostgreSQL con `uuid-ossp`, y **solo 2 tablas** |

El script SQL completo no es portable: `AUTO_INCREMENT`, `ENUM(...)` y `ENGINE=InnoDB` no
existen en PostgreSQL.

### C2 — Idioma del esquema y de la API

| Fuente | Dice |
|---|---|
| `Estandares de Codificacion.pdf` | Tablas y columnas **en inglés**: `appointments`, `starts_at`, `doctor_id`, `is_active`. Rutas `/api/v1/appointments`, `/available-slots` |
| Documento de estructura de BD + ER | Tablas y columnas **en español**: `citas`, `fecha_inicio`, `id_medico`, `activo` |

También difiere la convención de llave primaria: el estándar dice `id`; el ER usa `id_cita`,
`id_medico`, etc.

### C3 — Despliegue: tres destinos incompatibles

| Fuente | Dice |
|---|---|
| Plan de trabajo | AWS o Azure |
| `GA10-...AA6...Plataforma_Produccion.pdf` | **Netlify**, `medicitas-demo.netlify.app` |
| `GA10-...AA5...` | Docker Compose local (Ubuntu + Apache + MySQL) |

Netlify no ejecuta un backend NestJS ni una base de datos; solo sirve archivos estáticos. Tal
como está, el despliegue documentado no puede alojar el sistema descrito.

### C4 — Backend: NestJS vs Express

`Servidor Local y Despliegue.pdf` monta el servidor de aplicaciones con **Express**; el resto de
la documentación especifica **NestJS**. NestJS corre sobre Express, así que no es incompatible,
pero el documento no lo aclara.

### C5 — Paleta: azul vs verde

La paleta oficial es azul `#1E88E5`, pero el manual de usuario dice que la opción activa del menú
lateral "se resalta en **verde**" y que los días con cupo se pintan en **verde** en el calendario.
No hay color verde definido en la paleta.

### C6 — Quién se registra

El manual dice "Los pacientes crean su propia cuenta; las cuentas de médico y administrador las
crea el administrador". Pero la tabla de funcionalidades marca "Registro de pacientes y médicos"
como disponible para "Los tres" perfiles.

### C7 — Inasistencia

El manual instruye al médico a registrar la inasistencia **cancelando** la cita con motivo
"Inasistencia del paciente", pero luego define un reporte de "Inasistencia" separado de la "Tasa
de cancelación". Con un solo estado `CANCELADA` y sin columna de motivo, ese reporte no se puede
construir.

### C8 — Documentos que no pertenecen al proyecto

`docs/Informe.pdf` es un taller de SQL sobre una tabla `libreta` (agenda de contactos, MySQL) sin
relación con MediCitas. `docs/GA6-230101507-AA3-EV01_Ficha_Antropometrica...` es una evidencia de
acondicionamiento físico. Varios PDF tienen portada con un título que no corresponde a su
contenido (p. ej. "Plan de validación de características mínimas de hardware" encabeza el
documento de mapa de navegación). No afectan el desarrollo; los menciono para que no se tomen
como requisitos.

---

## 3. Problemas técnicos en el modelo de datos

Estos son defectos del diseño actual, no ambigüedades de redacción.

### D1 — La restricción de solapamiento no impide solapamientos

`UNIQUE (id_medico, fecha_inicio)` solo impide **dos citas que empiezan exactamente a la misma
hora**. No impide que el médico tenga una cita de 08:00–08:30 y otra de 08:15–08:45. El documento
afirma que "la base de datos debe impedir que un médico tenga dos citas a la misma hora"; la
restricción no cumple esa promesa en el caso general.

### D2 — Una cita cancelada bloquea el cupo para siempre

Esa misma `UNIQUE` incluye las citas con estado `CANCELADA`. El manual dice que al cancelar "el
horario vuelve a quedar libre", pero con esta restricción **nadie puede volver a reservar ese
cupo**: el `INSERT` fallará con error 1062.

### D3 — Un paciente puede reservar dos citas simultáneas

No existe ninguna restricción sobre `(id_paciente, fecha_inicio)`. El mismo paciente puede
reservar con dos médicos distintos a la misma hora.

### D4 — Faltan entidades que el manual describe como funcionalidad

| Funcionalidad del manual | Tabla o columna que falta |
|---|---|
| "Bloqueo de fechas" (vacaciones, incapacidad) | No existe tabla de ausencias |
| Observaciones clínicas al completar la cita | No existe columna en `citas` |
| Motivo de cancelación | No existe columna en `citas` |
| Enlace de activación de cuenta | No existe tabla de tokens |
| Enlace de recuperación de contraseña (vence a 30 min) | No existe tabla de tokens |
| Bloqueo tras 5 intentos fallidos, 15 min | No existe registro de intentos |
| Parámetros configurables (plazo de cancelación, recordatorios, plantillas) | No existe tabla de parámetros |
| Preferencia de canal de notificación del paciente | No existe columna en `pacientes` |
| Reprogramación (¿nueva cita o edición?) | Sin trazabilidad definida |

### D5 — `usuarios.estado` no contempla "pendiente de activación"

El ENUM es `('ACTIVO','INACTIVO')`, pero el manual describe el mensaje "Su cuenta se encuentra
inactiva — revise el correo de activación", que es un tercer estado distinto de "desactivada por
el administrador".

### D6 — `notificaciones.id_cita` es obligatorio

Es `NOT NULL` con FK a `citas`, pero el manual lista notificaciones que no tienen cita asociada:
activación de cuenta y confirmación de cambio de contraseña.

### D7 — `telefono` es opcional pero WhatsApp lo exige

`usuarios.telefono` es `NULL`. Si el paciente elige WhatsApp como canal, el envío falla en
tiempo de ejecución sin que nada lo impida antes.

### D8 — El consultorio no tiene control de ocupación

`citas.id_consultorio` no participa de ninguna restricción de unicidad. Dos médicos pueden quedar
asignados al mismo consultorio a la misma hora.

### D9 — Sin manejo de zona horaria

Todos los campos son `DATETIME` sin zona. Colombia es UTC−5 fijo, sin horario de verano, así que
es manejable, pero conviene fijar la regla explícitamente.

### D10 — `roles` como tabla + CHECK sobre tres valores fijos

Una tabla, una FK y un CHECK para tres valores que nunca cambiarán. Es correcto, pero es peso
que un MVP puede no necesitar.

---

## 4. Alcance: lo que la documentación promete hoy

Inventario de todo lo que el manual de usuario describe como funcionalidad existente:

**Autenticación**: registro con activación por correo · login · logout · recuperación de
contraseña por enlace con vencimiento · bloqueo tras 5 intentos · expiración de sesión a 30 min ·
cambio de contraseña obligatorio en primer ingreso del médico.

**Paciente**: panel con próximas citas · asistente de agendamiento de 3 pasos · calendario de
disponibilidad en tiempo real · confirmar · reprogramar · cancelar con motivo y con ventana de
anticipación · historial con pestañas, filtros y paginación · edición de perfil · elección de
canal de notificación · preguntas frecuentes.

**Médico**: agenda diaria / semanal / mensual · configuración de días, franjas y duración de
consulta · bloqueo de fechas con resolución de citas afectadas · registro de atención con
observaciones · listado de pacientes atendidos con histórico · cancelación con motivo.

**Administrador**: panel con indicadores (citas del día, cancelaciones, pacientes nuevos,
ocupación) · gestión de usuarios y roles · activación/desactivación · vista global de citas con
reasignación · catálogos de especialidades y consultorios · parámetros del sistema · plantillas
de mensajes · 4 reportes con gráficos y exportación a PDF y Excel.

**Notificaciones**: 6 eventos distintos, por correo **y WhatsApp**, con recordatorios
programados a 24 h y 2 h antes.

Esto es, razonablemente, entre 4 y 6 meses de trabajo de un equipo. **Muy por encima de un MVP
universitario.** Las preguntas de la sección 5 apuntan sobre todo a recortarlo.

---

## 5. Preguntas

### Bloque A — Stack y alcance (bloqueantes)

**A1.** Motor de base de datos: ¿**PostgreSQL** (lo que dicen el plan de trabajo y los estándares)
o **MySQL** (lo que dice el documento de estructura de BD y el diagrama ER que ya está
entregado)? Mi recomendación: PostgreSQL, y regenerar el script y el diagrama ER, porque es el
motor que declaran las dos evidencias de arquitectura y porque permite restricciones de
solapamiento reales (`EXCLUDE` con `tstzrange`) que MySQL no tiene.

**A2.** Backend: ¿mantenemos **NestJS** o simplificamos? NestJS es lo que dice toda la
documentación y encaja con los estándares de codificación (módulos, DTO, decoradores), pero
añade bastante ceremonia. La alternativa de menor fricción sería usar **Next.js completo**
(rutas de API en el mismo proyecto), lo que elimina un despliegue entero.

**A3.** ¿La aplicación tiene que quedar **desplegada en internet** para la entrega, o basta con
que corra en local (`docker compose up`) y con capturas? Esto cambia mucho el esfuerzo.

**A4.** ¿Hay una **fecha de entrega** y cuántas personas van a codificar? Determina cuánto se
puede recortar.

### Bloque B — Recorte de alcance

Propongo el siguiente corte. Necesito confirmación o ajuste de cada línea.

| Funcionalidad | Propuesta MVP | ¿De acuerdo? |
|---|---|---|
| Registro de paciente + login JWT | **Sí** | |
| Activación de cuenta por correo | **No** — cuenta activa al registrarse | |
| Recuperación de contraseña por correo | **No** | |
| Bloqueo por 5 intentos fallidos | **No** | |
| 3 roles con menús diferenciados | **Sí** | |
| Catálogo de especialidades | **Sí** (semilla fija, sin CRUD) | |
| Catálogo de consultorios | **No** — quitar del MVP | |
| Horarios del médico (días + franjas + duración) | **Sí** | |
| Bloqueo de fechas / ausencias | **No** | |
| Cálculo de cupos disponibles | **Sí** (núcleo del proyecto) | |
| Asistente de agendamiento de 3 pasos | **Sí** | |
| Confirmar cita | **Sí** | |
| Cancelar cita con motivo | **Sí** | |
| Reprogramar | **No** — se cancela y se agenda de nuevo | |
| Marcar como completada + observaciones | **Sí** | |
| Historial de citas del paciente | **Sí** | |
| Agenda diaria del médico | **Sí** | |
| Agenda semanal / mensual del médico | **No** | |
| Panel admin con 4 indicadores | **Sí** (contadores simples) | |
| Gestión de usuarios (crear médico, activar/desactivar) | **Sí** | |
| Reportes con gráficos | **1 solo** gráfico (citas por especialidad) | |
| Exportación a PDF / Excel | **No** | |
| Parámetros configurables del sistema | **No** — constantes en código | |
| Plantillas de mensajes editables | **No** | |
| Notificaciones por correo | **Registro en BD + vista "Avisos" en la app**, sin envío real | |
| Notificaciones por WhatsApp | **No** — requiere cuenta de WhatsApp Business, no es viable | |
| Recordatorios programados (24 h / 2 h) | **No** — requiere un planificador | |
| Disponibilidad "en tiempo real" (websockets) | **No** — se revalida al confirmar | |

**B1.** ¿Alguna de las líneas marcadas "No" es **obligatoria** por la rúbrica del proyecto
formativo? Si alguna evidencia SENA exige, por ejemplo, integración con un servicio externo,
dímelo y la dejamos dentro.

### Bloque C — Reglas de negocio a fijar

**C1.** **Confirmación de la cita.** ¿Quién confirma y qué pasa si nadie confirma?
- (a) El paciente confirma; si no lo hace, la cita sigue válida como `RESERVADA`.
- (b) El médico/admin confirma.
- (c) Quitamos el estado `CONFIRMADA` del MVP (solo `RESERVADA → COMPLETADA / CANCELADA`).

**C2.** **Ventana de cancelación.** El manual sugiere 24 h. ¿La dejamos como constante de 24 h,
o el paciente puede cancelar hasta el momento de la cita?

**C3.** **Cancelación por el médico.** ¿Puede el médico cancelar una cita ya reservada? ¿Y el
administrador?

**C4.** **Inasistencia.** ¿Agregamos un quinto estado `NO_ASISTIO` (más limpio, permite el
reporte) o lo dejamos como una cancelación con motivo?

**C5.** **Generación de cupos.** Entiendo la regla así: por cada franja de `horarios_medico`
(día de semana, hora inicio, hora fin), se generan cupos consecutivos de `duracion_cita_min`
minutos, y un cupo está libre si no existe una cita activa del médico que lo ocupe. Los horarios
son **recurrentes semanalmente** y no tienen fecha de vigencia. ¿Correcto?

**C6.** **Ventana de agendamiento.** ¿Con cuánta anticipación máxima se puede agendar? Propongo
**60 días**, y mínimo de **2 horas** antes.

**C7.** **Solapamiento del paciente.** ¿Impedimos que un paciente tenga dos citas a la misma
hora? Propongo que sí.

**C8.** **Citas por paciente.** ¿Hay límite de citas activas simultáneas por paciente? Propongo
que no, pero es un vector obvio de abuso en una demo.

**C9.** **Cuenta del médico.** ¿La crea el administrador (manual) o el médico se autorregistra y
el admin lo aprueba? Propongo: la crea el administrador, con contraseña temporal mostrada en
pantalla.

**C10.** **Datos del paciente.** ¿`fecha_nacimiento`, `genero`, `direccion` y `eps` se piden en
el registro o son opcionales del perfil? Propongo: fecha de nacimiento y género en el registro;
dirección y EPS opcionales.

**C11.** **Zona horaria.** ¿Fijamos todo a `America/Bogota` (UTC−5) y guardamos en UTC?

### Bloque D — Convenciones

**D1.** Idioma del esquema y de la API: ¿**inglés** (como exige el documento de estándares de
codificación) o **español** (como está el diagrama ER ya entregado)? Recomiendo **inglés**, y
regenerar el ER: el estándar de codificación es el documento más reciente y específico, y evita
híbridos como `getCitasDisponibles` que el propio estándar prohíbe.

**D2.** ¿Mantenemos la estructura de repositorio del plan de trabajo (`/frontend`, `/backend`,
`/docs`, `/database`)? ¿Inicializo git aquí (la carpeta actual **no es un repositorio**) y con
qué remoto?

**D3.** ¿Verde para el estado activo del menú y los días con cupo (como dice el manual), o todo
en la paleta azul? Propongo añadir un verde de éxito `#2E7D32` a la paleta y documentarlo.

**D4.** ¿Interfaz de usuario en **español** (textos, mensajes, etiquetas)? Doy por hecho que sí.

### Bloque E — Datos y pruebas

**E1.** ¿Quieres **datos de demostración** (seed) con médicos, horarios, pacientes y citas ya
cargados para poder mostrar el sistema funcionando sin tener que llenarlo a mano? Recomiendo que
sí, es lo que hace demostrable el proyecto.

**E2.** ¿Qué nivel de **pruebas** se espera? Los estándares mencionan Jest y una lista de
verificación previa a integración. Propongo: pruebas unitarias solo sobre la lógica de cupos y
las reglas de estado de la cita, que es donde está el riesgo real.

**E3.** ¿Necesitas que la documentación de arquitectura quede también en formato de **evidencia
SENA** (portada, objetivos, conclusiones, bibliografía) o basta con markdown técnico?

---

## 6. Qué se produjo

Ver el [índice de la especificación](README.md). Los documentos 01 a 09 desarrollan todo lo que
esta sección anticipaba.
