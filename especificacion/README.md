# MediCitas — Especificación de arquitectura y desarrollo

Sistema web de gestión de citas médicas. Proyecto formativo SENA, programa Análisis y Desarrollo
de Software.

Esta carpeta es **la fuente de verdad** para construir la aplicación. Donde esta especificación
contradiga algo de `docs/`, manda esta especificación; la sección [Decisiones tomadas](#decisiones-tomadas)
explica cada desviación y por qué.

---

## Índice

| Documento | Contenido |
|---|---|
| [00 — Hallazgos y preguntas](00-hallazgos-y-preguntas.md) | Análisis crítico de `docs/`: contradicciones, defectos del modelo y preguntas que originaron las decisiones |
| [01 — Visión y alcance](01-vision-y-alcance.md) | Qué es el producto, qué entra y **qué queda fuera** |
| [02 — Reglas de negocio](02-reglas-de-negocio.md) | Actores, casos de uso y reglas numeradas (RN-xx) |
| [03 — Modelo de datos](03-modelo-de-datos.md) | DDL de PostgreSQL, diccionario de datos, diagrama ER |
| [04 — API](04-api.md) | Los 30 endpoints REST: método, ruta, permisos, cuerpo, errores |
| [05 — Frontend](05-frontend.md) | Rutas, pantallas, catálogo de componentes y hooks |
| [06 — Sistema de diseño](06-sistema-de-diseno.md) | Paleta, tipografía, espaciado, estados, accesibilidad |
| [07 — Arquitectura y entorno](07-arquitectura-y-entorno.md) | Stack, estructura de carpetas, variables de entorno, Docker |
| [08 — Pruebas y datos semilla](08-pruebas-y-datos-semilla.md) | Qué se prueba y con qué datos se demuestra |
| [09 — Plan de implementación](09-plan-de-implementacion.md) | Orden de construcción en 9 fases |

---

## Decisiones tomadas

Estas decisiones cierran las contradicciones detectadas en `docs/`. Cada una se acordó
explícitamente antes de redactar la especificación.

| # | Decisión | Sustituye a | Por qué |
|---|---|---|---|
| 1 | **PostgreSQL 16** | El DDL y el diagrama ER en MySQL 8.0 | Es lo que declaran el plan de trabajo y los estándares de codificación. Además permite restricciones `EXCLUDE` que impiden el solapamiento de citas en el propio motor — el defecto más grave del modelo entregado (ver [00, D1–D3](00-hallazgos-y-preguntas.md)) |
| 2 | **Next.js completo**, con la API en Route Handlers | Backend NestJS separado | Un solo proyecto, un solo despliegue, la mitad del código. La API sigue siendo REST versionada (`/api/v1/...`), como exigen los estándares |
| 3 | **Ejecución local** con Docker Compose | Netlify / AWS / Azure (los tres se contradicen entre sí) | Netlify no puede alojar un backend ni una base de datos. Sin costo, sin cuentas, sin tiempo perdido en infraestructura |
| 4 | **Inglés** en esquema, API e identificadores | El ER en español (`citas`, `fecha_inicio`) | Lo exige el documento de estándares de codificación, que es el más específico. La interfaz de usuario sigue en español |
| 5 | **Notificaciones solo dentro de la aplicación** | Envío por correo y WhatsApp | Se modela la entidad completa y se muestra en la campana y en "Avisos". El envío externo queda documentado como trabajo futuro |
| 6 | **4 estados de cita, sin reprogramación** | Reprogramación con liberación de cupo | Reprogramar = cancelar y agendar de nuevo. Elimina el caso de uso más complejo sin perder ninguna capacidad real |
| 7 | **Sin activación ni recuperación por correo** | Enlaces con vencimiento, bloqueo por intentos | La contraseña se cambia desde el perfil, o la resetea el administrador desde el panel |
| 8 | **Panel admin reducido** | 4 reportes con exportación a PDF y Excel | 4 indicadores, gestión de usuarios y un gráfico de citas por especialidad |
| 9 | **Sin consultorios** | Tabla `consultorios` y asignación de sala | No aporta nada al caso de uso central y añade una entidad y una restricción de ocupación |
| 10 | **Rol como tipo enumerado**, sin tabla `roles` | Tabla `roles` con FK y CHECK | Tres valores que nunca cambiarán. Elimina una tabla y un `JOIN` en cada consulta de usuario |

### Ventana de cancelación

Se mantiene la regla de **24 horas** del manual de usuario, como constante en código
(`CANCELLATION_WINDOW_HOURS`). Es una regla de negocio visible y demostrable; para la
sustentación puede bajarse a 1 hora cambiando una línea.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript estricto |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL 16 |
| Acceso a datos | Prisma ORM |
| Autenticación | JWT en cookie `httpOnly` (`jose`) |
| Hash de contraseña | `bcryptjs` |
| Validación | Zod (equivalente a los DTO con decoradores del estándar) |
| Formularios | React Hook Form |
| Datos en cliente | TanStack Query |
| Gráficos | Recharts |
| Fechas | date-fns + date-fns-tz |
| Iconos | lucide-react |
| Pruebas | Vitest |
| Calidad | ESLint + Prettier |
| Entorno | Docker Compose (PostgreSQL + migración/semilla + aplicación) |

---

## Consistencia interna

La especificación pasó una auditoría cruzada. Lo verificado, y que debe seguir cumpliéndose ante
cualquier cambio futuro:

| Comprobación | Estado |
|---|---|
| Los 30 endpoints del índice coinciden con los detallados | ✅ |
| Todos los `CU-xx` citados en 04 están definidos en 02 | ✅ |
| Todas las `RN-xx` citadas en cualquier documento están definidas en 02 | ✅ |
| Las 9 llaves foráneas del DDL coinciden con la tabla de integridad referencial | ✅ |
| Las 7 restricciones `CHECK` del DDL coinciden con su tabla | ✅ |
| Los 5 índices del DDL coinciden con su tabla | ✅ |
| Las 9 relaciones del diagrama ER coinciden con las llaves foráneas del DDL | ✅ |
| El diagrama Mermaid renderiza sin errores | ✅ verificado |
| Los enlaces entre documentos y sus anclas de sección resuelven | ✅ |
| Los ratios de contraste recalculados con la fórmula WCAG 2.1 | ✅ |
| Las duraciones de la semilla producen los cupos que el documento afirma | ✅ |

### Correcciones aplicadas

Contradicciones detectadas **dentro de esta especificación** y ya resueltas:

| # | Contradicción | Resolución |
|---|---|---|
| 1 | El índice anunciaba 26 endpoints; hay 30 | Corregido el conteo |
| 2 | `CANCELLATION_WINDOW_HOURS` remitía a RN-23 (confirmación) en vez de RN-24 (cancelación) | Corregida la referencia |
| 3 | Se citaban `RN-13.n` y `RN-21.n` sin que esas subreglas estuvieran numeradas | Ambas listas convertidas en tablas con identificador propio |
| 4 | El mensaje de `SLOT_TAKEN` difería entre 04 y 05/06 | Unificado al texto de 06 |
| 5 | 04 decía que el administrador no ve las observaciones clínicas; RN-30 solo le prohibía escribirlas | RN-30 ahora prohíbe leerlas y escribirlas, y la API omite el campo |
| 6 | 07 ubicaba las pruebas unitarias en `tests/unit/`; 08 las ponía junto al código | Unificado: unitarias junto al código, integración en `tests/integration/` |
| 7 | ESLint con `max-lines-per-function: 40` chocaba con el límite de 150 líneas por componente | Anulación explícita para archivos `.tsx` |
| 8 | 06 daba un mensaje propio para "cuenta inactiva" en el login; 04 no distingue causas para no filtrar quién está registrado | El mensaje se reserva para la sesión ya abierta, y se documenta la desviación respecto al manual |
| 9 | La semilla afirmaba cubrir el caso de franja que no divide exacto, pero las cinco dividían exacto | Carolina Vega pasa a 50 min: 240 min ÷ 50 deja 4 cupos y descarta 40 min |
| 10 | Tres ratios de contraste estaban mal calculados | Recalculados: 3.68, 5.75 y 4.23 en vez de 3.5, 5.6 y 3.9 |
| 11 | El botón de peligro usaba `#E53935` con texto de 16 px en negrita, que **no** es texto grande para WCAG y se quedaba en 4.23:1 | El fondo pasa a `#C62828` (5.62:1). `#E53935` queda para bordes, iconos y texto de error |
| 12 | Faltaba el diagrama ER del modelo nuevo | Añadido en Mermaid, verificado |

---

## Estado

**Implementación completada** — las 9 fases del [plan](09-plan-de-implementacion.md) están
construidas y la aplicación corre con `docker compose up --build`. Ver el
[README del proyecto](../README.md) para las cuentas de demostración.
