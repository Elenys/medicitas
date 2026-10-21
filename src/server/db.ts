import { PrismaClient } from '@prisma/client';

// Cliente único de Prisma. En desarrollo se reutiliza entre recargas para no
// agotar las conexiones.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type { PrismaClient };
export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
