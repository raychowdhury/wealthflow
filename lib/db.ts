import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** Returns true only when DATABASE_URL is set and not the dev placeholder. */
export function isDbConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.length > 0 && !url.includes('user:password@localhost');
}

// Suppress Prisma stderr logging when DB is not configured so try-catch
// blocks stay truly silent rather than printing 'prisma:error' noise.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isDbConfigured() ? ['error'] : [] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
