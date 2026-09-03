import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDebug = process.env.DEBUG === 'true' || process.env.APP_DEBUG === 'true';

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDebug
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
