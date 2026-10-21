# syntax=docker/dockerfile:1
# MediCitas — imagen de la aplicación (especificacion/07-arquitectura-y-entorno.md)
#
#   deps    → instala dependencias
#   builder → genera el cliente de Prisma y compila Next.js (salida standalone)
#             También se usa como imagen del servicio "migrate" de docker-compose,
#             porque conserva el CLI de Prisma y el código de la semilla.
#   runner  → imagen mínima de producción

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# DATABASE_URL no se necesita para compilar, pero Prisma valida que exista.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV JWT_SECRET="solo-para-compilar-no-se-usa-en-tiempo-de-ejecucion"
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
