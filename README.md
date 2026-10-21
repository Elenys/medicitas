# MediCitas

Sistema web de gestión de citas médicas. Proyecto formativo SENA — Análisis y Desarrollo de
Software.

Pacientes que reservan en línea sobre la disponibilidad real de cada médico, médicos que
gestionan su agenda y registran la atención, y un administrador que supervisa la operación.
La garantía central —**un cupo no se puede reservar dos veces**— vive en la base de datos, no
solo en el código.

- Especificación completa: [`especificacion/`](especificacion/README.md)
- Documentación original del proyecto formativo: [`docs/`](docs/)

## Puesta en marcha con Docker (recomendado)

Requisitos: Docker Desktop.

```bash
docker compose up --build
```

Eso levanta PostgreSQL, aplica las migraciones, carga los datos de demostración y arranca la
aplicación en **http://localhost:3000**. La primera vez tarda unos minutos mientras construye
la imagen.

Para detener: `docker compose down`. Para borrar también los datos: `docker compose down -v`.

## Cuentas de demostración

Contraseña de todas: **`Medicitas2026`**

| Rol | Correo | Para qué sirve |
|---|---|---|
| Paciente | `paciente@correo.com` | El recorrido principal: tiene una cita para confirmar, una para cancelar, una dentro de 24 h (no cancelable) y cinco en el historial |
| Médico | `laura.medina@medicitas.com` | Medicina General, con citas pasadas aún reservadas para demostrar el registro de atención |
| Médico | `andres.ramirez@medicitas.com` | Pediatría, consultas de 20 min |
| Médico | `pedro.cano@medicitas.com` | **Sin horarios**: no aparece al agendar |
| Administrador | `admin@medicitas.com` | Panel, usuarios, citas y reportes |
| Paciente | `inactivo@correo.com` | **Cuenta desactivada**: no puede entrar |

El guion de demostración de 20 pasos está en
[`especificacion/08-pruebas-y-datos-semilla.md`](especificacion/08-pruebas-y-datos-semilla.md#5-guion-de-demostración).

## Desarrollo local (sin contenedor para la aplicación)

Requisitos: Node.js 22+ y Docker para la base de datos.

```bash
cp .env.example .env            # y cambie JWT_SECRET
npm install
docker compose up -d db
npx prisma migrate deploy
npm run db:seed
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run verify` | Typecheck + lint + pruebas — lo que debe pasar antes de integrar |
| `npm test` | Pruebas unitarias (Vitest), sin base de datos |
| `npm run test:integration` | Pruebas contra PostgreSQL real (restricciones `EXCLUDE` y concurrencia); usan la base `medicitas_test`, que crean solas |
| `npm run db:seed` | Carga los datos de demostración (idempotente; `SEED_FORCE=1` reinicia) |
| `npm run db:studio` | Prisma Studio |

## Stack

Next.js 16 (App Router, Route Handlers) · TypeScript estricto · Tailwind CSS 4 · PostgreSQL 16 ·
Prisma · Zod · JWT en cookie `httpOnly` · TanStack Query · React Hook Form · Recharts · Vitest.

## Estructura

```
prisma/          esquema, migración (con las restricciones EXCLUDE) y semilla
src/app/         páginas y API (/api/v1/…)
src/components/  ui/ genéricos · layout/ · appointments/ · schedules/ · users/ · dashboard/
src/hooks/       datos y sesión en el cliente
src/lib/         constantes, fechas, generación de cupos, reglas de la cita, esquemas Zod
src/server/      Prisma, sesión, envoltorio HTTP y servicios de dominio
```
