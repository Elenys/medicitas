# 07 — Arquitectura y entorno

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                      Navegador                           │
│   React · TanStack Query · React Hook Form · Tailwind    │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS · cookie httpOnly
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  Next.js (un solo proceso)               │
│                                                          │
│  proxy.ts ──► verifica el JWT y redirige por rol         │
│                                                          │
│  app/(app), app/(auth) ──► páginas y componentes         │
│                                                          │
│  app/api/v1/…  ──► route handlers                        │
│         │  1. sesión y rol                               │
│         │  2. validación Zod                             │
│         │  3. servicio de dominio                        │
│         │  4. serialización                              │
│         ▼                                                │
│  server/services/  ──► reglas de negocio                 │
│         │                                                │
│         ▼                                                │
│  server/db.ts (Prisma)                                   │
└────────────────────────┬─────────────────────────────────┘
                         │ TCP 5432
                         ▼
┌──────────────────────────────────────────────────────────┐
│            PostgreSQL 16 (contenedor Docker)             │
│   Restricciones EXCLUDE: la última línea de defensa      │
└──────────────────────────────────────────────────────────┘
```

### Por qué Next.js completo en lugar de NestJS separado

Toda la documentación de `docs/` especifica un backend NestJS independiente. La desviación se
justifica así:

| Criterio | NestJS separado | Next.js completo |
|---|---|---|
| Proyectos que mantener | 2 | 1 |
| Despliegues | 2 | 1 |
| Tipos compartidos entre front y back | Duplicados o en un paquete aparte | Importados directamente |
| Esquemas de validación | Duplicados (DTO + formulario) | **Un solo esquema Zod** |
| CORS y cookies entre dominios | Hay que configurarlo | No existe el problema |
| Fidelidad a los estándares de codificación | Total | Alta: se conserva la separación en capas, la validación declarativa y la API REST versionada |

Lo que **no** se pierde: la API sigue siendo REST versionada en `/api/v1`, con rutas en plural y
`kebab-case`; la lógica de negocio sigue viviendo en servicios separados de la capa HTTP; la
validación de toda entrada externa sigue siendo declarativa y previa a la lógica.

Lo que se gana, concretamente: el esquema Zod de registro se escribe una vez y lo usan el
formulario y el route handler. Con dos proyectos serían dos definiciones que se desincronizan a
la primera modificación.

### Las tres capas de defensa

Una misma regla se verifica en tres lugares, con propósitos distintos:

| Capa | Propósito | Ejemplo con RN-22 |
|---|---|---|
| Interfaz | Que el usuario no intente lo imposible | La franja ocupada aparece tachada y no es pulsable |
| Servicio | Dar un mensaje claro | Consulta si el cupo está libre y lanza `SlotTakenError` |
| Base de datos | **Garantizar la regla** | `EXCLUDE USING gist` rechaza el `INSERT` con `23P01` |

Solo la tercera es una garantía. Las dos primeras son cortesía. Cuando dos pacientes pulsan
"Confirmar" en el mismo milisegundo, las dos primeras capas pueden pasar y solo el motor decide.

---

## 2. Estructura del repositorio

Se adapta la estructura del plan de trabajo (`/frontend`, `/backend`, `/docs`, `/database`) a la
decisión de un solo proyecto:

```
medicitas/
├── docs/                          # Documentación original del proyecto formativo (sin tocar)
├── especificacion/                # Esta especificación
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   └── …/migration.sql        # Incluye las restricciones EXCLUDE manuales
│   └── seed.ts
├── src/
│   ├── app/                       # Ver 05-frontend.md
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── server/
│   ├── types/
│   └── proxy.ts                   # Next.js 16 llama "proxy" a lo que antes era middleware
│                                  # Las pruebas unitarias van junto al archivo que prueban:
│                                  # src/lib/availability.ts → src/lib/availability.test.ts
├── tests/
│   └── integration/               # Pruebas contra PostgreSQL real
├── public/
├── .env.example
├── .env                           # Ignorado por git
├── .gitignore
├── .editorconfig
├── Dockerfile                     # etapas deps → builder → runner
├── .dockerignore
├── docker-compose.yml             # db + migrate + app
├── eslint.config.mjs
├── prettier.config.mjs
├── next.config.ts
├── postcss.config.mjs             # Tailwind 4: los tokens viven en globals.css (@theme), sin tailwind.config
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

---

## 3. Variables de entorno

`.env.example` se versiona con valores de ejemplo; `.env` **nunca** se versiona.

```bash
# Base de datos
DATABASE_URL="postgresql://medicitas:medicitas@localhost:5432/medicitas?schema=public"

# Sesión — generar con: openssl rand -base64 32
JWT_SECRET="cambie-este-valor-por-uno-generado-aleatoriamente"

# Aplicación
NEXT_PUBLIC_APP_NAME="MediCitas"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NODE_ENV="development"
```

Al arrancar, `src/lib/env.ts` valida estas variables con Zod y **detiene el proceso** si falta
alguna o si `JWT_SECRET` tiene menos de 32 caracteres. Es preferible fallar al arrancar que
descubrirlo cuando un usuario intenta iniciar sesión.

---

## 4. Entorno local

### 4.1 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: medicitas-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: medicitas
      POSTGRES_PASSWORD: medicitas
      POSTGRES_DB: medicitas
    ports:
      - '5432:5432'
    volumes:
      - medicitas-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U medicitas -d medicitas']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  medicitas-data:
```

**Actualización de construcción.** El `docker-compose.yml` definitivo levanta **todo** con un
solo comando —base de datos, migración con semilla, y la aplicación— porque así se pidió al
construir. Tiene tres servicios:

| Servicio | Imagen | Qué hace |
|---|---|---|
| `db` | `postgres:16-alpine` | Base de datos con volumen persistente y healthcheck |
| `migrate` | etapa `builder` del `Dockerfile` | `prisma migrate deploy` + semilla; termina y libera al siguiente |
| `app` | etapa `runner` del `Dockerfile` (salida `standalone` de Next.js) | La aplicación en `:3000` |

`app` arranca solo cuando `db` está sana y `migrate` terminó con éxito. Para desarrollo con
recarga en caliente sigue siendo posible levantar solo `db` y correr `npm run dev` localmente.

### 4.2 Puesta en marcha

Con Docker, todo:

```bash
docker compose up --build
```

Para desarrollo local con recarga en caliente:

```bash
cp .env.example .env          # y generar el JWT_SECRET
npm install
docker compose up -d db
npx prisma migrate deploy
npm run db:seed
npm run dev
```

La aplicación queda en `http://localhost:3000`.

### 4.3 Scripts de `package.json`

| Script | Qué hace |
|---|---|
| `dev` | Servidor de desarrollo |
| `build` | Compilación de producción |
| `start` | Servidor de producción |
| `lint` | ESLint |
| `format` | Prettier sobre `src/` |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest una vez |
| `test:watch` | Vitest en modo observador |
| `db:migrate` | `prisma migrate dev` |
| `db:seed` | Carga los datos de demostración |
| `db:reset` | Borra, migra y vuelve a sembrar |
| `db:studio` | Prisma Studio |
| `verify` | `typecheck && lint && test` — lo que debe pasar antes de integrar |

---

## 5. Dependencias

### Producción

| Paquete | Para qué |
|---|---|
| `next`, `react`, `react-dom` | Framework |
| `@prisma/client` | Acceso a datos |
| `zod` | Validación de toda entrada externa |
| `jose` | Firma y verificación del JWT |
| `bcryptjs` | Hash de contraseñas |
| `@tanstack/react-query` | Datos en el cliente |
| `react-hook-form`, `@hookform/resolvers` | Formularios |
| `date-fns`, `date-fns-tz` | Fechas y zona horaria |
| `recharts` | El gráfico del panel |
| `lucide-react` | Iconos |
| `clsx`, `tailwind-merge` | Composición de clases |

### Desarrollo

`typescript`, `@types/*`, `prisma`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`,
`eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`, `vitest`,
`@testing-library/react`, `@testing-library/user-event`, `jsdom`, `tsx`.

**Sobre `middleware.ts`.** Next.js 16 renombró el middleware a `proxy.ts` (misma función, otro
nombre). Donde esta especificación dice `middleware.ts`, en el código es `src/proxy.ts`.

**Decisión sobre Jest.** Los estándares de codificación nombran Jest. Se usa **Vitest**, que
tiene la misma API (`describe`, `it`, `expect`) y funciona con TypeScript y ESM sin
configuración adicional. Migrar entre ambos es reemplazar el importador.

---

## 6. Calidad del código

### TypeScript

`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`.
El tipo `any` está prohibido por regla de ESLint (`@typescript-eslint/no-explicit-any: error`).

### ESLint — reglas que hacen cumplir el estándar

| Regla | Estándar que aplica |
|---|---|
| `@typescript-eslint/no-explicit-any` | Prohibición del tipo `any` |
| `@typescript-eslint/explicit-function-return-type` | Tipo de retorno explícito |
| `no-var`, `prefer-const` | `const` por omisión, `var` prohibido |
| `max-lines-per-function: 40` (sin contar líneas en blanco ni comentarios) | El estándar dice 30; se dejó en 40 porque las consultas de Prisma con `include` ocupan líneas sin añadir lógica |
| `max-params: 3` | Máximo tres parámetros |
| `max-depth: 2` | Máximo dos niveles de anidación |
| `complexity: 10` | Complejidad ciclomática |
| `no-magic-numbers` | Ningún valor numérico sin nombre |
| `eqeqeq` | Comparación estricta |
| `no-console` (`warn` permitido) | Nada de `console.log` en producción |

**Excepción para componentes.** Un componente de React es una función, y el estándar le concede
150 líneas mientras que a una función corriente le concede 30. Sin una excepción explícita, las
dos reglas se contradicen. Se resuelve con una anulación por tipo de archivo:

```js
// eslint.config.mjs
{
  files: ['src/components/**/*.tsx', 'src/app/**/*.tsx'],
  rules: {
    'max-lines-per-function': ['error', { max: 150 }],
    'no-magic-numbers': 'off',   // los valores de layout en JSX no son números mágicos
  },
}
```

Fuera de los archivos `.tsx`, el límite de 30 líneas se aplica sin excepciones.

### Prettier

```js
{
  semi: true,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'all',
  plugins: ['prettier-plugin-tailwindcss'],
}
```

### Convenciones de nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componente y su archivo | PascalCase | `AppointmentCard.tsx` |
| Hook | camelCase con `use` | `useAvailableSlots.ts` |
| Servicio | kebab-case con `.service` | `appointments.service.ts` |
| Esquema Zod | kebab-case con `.schema` | `create-appointment.schema.ts` |
| Prueba | mismo nombre con `.test` | `availability.test.ts` |
| Carpeta | kebab-case en plural | `appointments/` |
| Tabla y columna | snake_case | `appointments`, `starts_at` |
| Ruta de la API | kebab-case en plural | `/api/v1/available-slots` |
| Constante | UPPER_SNAKE_CASE | `MAX_ADVANCE_BOOKING_DAYS` |
| Booleano | prefijo `is`/`has`/`can` | `isSlotAvailable`, `canCancelAppointment` |
| Manejador | `handle` en el componente, `on` en la prop | `handleCancelClick`, `onCancel` |

### Idioma

Identificadores en **inglés**; comentarios, documentación y textos de usuario en **español**.
Es lo que fija el documento de estándares de codificación, y evita construcciones como
`getCitasDisponibles`.

---

## 7. Git

### Ramas

| Rama | Propósito |
|---|---|
| `main` | Versiones entregadas. Siempre desplegable |
| `develop` | Integración del trabajo terminado |
| `feature/<descripcion>-<tarea>` | Una funcionalidad |
| `fix/<descripcion>-<tarea>` | Una corrección |

### Commits — Conventional Commits

```
feat(appointments): agrega reserva de citas en línea
fix(availability): corrige el cálculo del último cupo de la franja
docs: actualiza la especificación del modelo de datos
refactor(ui): extrae StatusBadge de AppointmentCard
test(availability): cubre franjas que no dividen exactamente
chore: actualiza dependencias
```

### `.gitignore`

```
node_modules/
.next/
out/
build/
.env
.env.local
*.log
.DS_Store
coverage/
/prisma/*.db
```

`.env` nunca entra al historial. `.env.example` sí, con valores de ejemplo.

### Antes de integrar

`npm run verify` debe pasar sin advertencias: comprobación de tipos, análisis estático y pruebas.

---

## 8. Seguridad

| Amenaza | Cómo se mitiga |
|---|---|
| Contraseñas expuestas | bcrypt con 10 rondas. El hash nunca sale de la capa de datos |
| Robo del token | Cookie `httpOnly` — inaccesible desde JavaScript |
| CSRF | `sameSite=lax` + la API solo acepta JSON, nunca `form-urlencoded` |
| Inyección SQL | Prisma parametriza. No hay concatenación de SQL |
| XSS | React escapa por omisión. `dangerouslySetInnerHTML` está prohibido |
| Escalada de privilegios | Cada handler verifica rol y propiedad del recurso en el servidor (RN-28 a RN-30) |
| Enumeración de usuarios | `INVALID_CREDENTIALS` no distingue correo inexistente de contraseña incorrecta |
| Enumeración de recursos | Acceder a una cita ajena devuelve `403`, sin revelar si existe |
| Filtración por mensajes de error | Los mensajes no exponen rutas, consultas ni trazas. El detalle se registra solo en el servidor |
| Secretos en el repositorio | `.env` en `.gitignore`; `env.ts` falla al arrancar si falta o es débil |

### Lo que no se cubre, y se declara

- Sin limitación de tasa: un atacante puede probar contraseñas sin freno.
- Sin bloqueo por intentos fallidos (fuera del alcance).
- Sin revocación de tokens: un token robado sirve hasta expirar.
- Sin HTTPS en local.
- Sin auditoría de accesos.

Estas ausencias son aceptables para un proyecto formativo que corre en local. Se documentan para
que nadie las confunda con un olvido.

---

## 9. Rendimiento

| Medida | Dónde |
|---|---|
| Componentes de servidor por omisión | `'use client'` solo donde hace falta interactividad |
| Índices sobre las consultas frecuentes | Ver [03, §5.4](03-modelo-de-datos.md) |
| Caché por tipo de dato | Ver [05, §4](05-frontend.md) |
| Paginación obligatoria | Ningún listado devuelve todo |
| Cálculo de cupos en el servidor | El cliente nunca recalcula disponibilidad |
| Una sola consulta por vista | Se evita el problema N+1 usando `include` de Prisma |

Objetivo: menos de 500 ms en operaciones de lectura con los datos semilla, en local.

---

## 10. Despliegue

**El MVP corre en local.** No se despliega a internet.

La aplicación queda preparada para desplegarse sin cambios de código:

1. `npm run build`
2. Una base de datos PostgreSQL accesible
3. `DATABASE_URL` y `JWT_SECRET` como variables de entorno del proveedor
4. `npx prisma migrate deploy`
5. `npm start`

En Vercel, el paso 5 es automático. La única condición es que el proveedor de base de datos
soporte la extensión `btree_gist` (Neon, Supabase y Railway la soportan).

**Sobre Netlify.** El documento `GA10-...AA6...` de `docs/` documenta un despliegue en Netlify.
Netlify solo sirve archivos estáticos y no puede alojar ni la API ni la base de datos, así que
esa ruta no aplica a esta aplicación. Queda registrado aquí para que la contradicción esté
explicada y no se repita.
