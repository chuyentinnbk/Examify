import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDebug = process.env.DEBUG === 'true' || process.env.APP_DEBUG === 'true';

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = databaseUrl || process.env.DATABASE_URL;
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: isDebug ? ['query', 'error', 'warn'] : ['error'],
  });
}

export function getPrismaInstance(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export async function refreshPrismaClient(newDatabaseUrl?: string): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    try {
      await globalForPrisma.prisma.$disconnect();
    } catch {
      // Ignore disconnect error on stale connection
    }
  }
  const newClient = createPrismaClient(newDatabaseUrl);
  globalForPrisma.prisma = newClient;
  return newClient;
}

// Transparent Proxy ensures any module importing `prisma` or `default`
// always delegates to the currently active Prisma instance
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaInstance();
    const val = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(client);
    }
    return val;
  },
});

export default prisma;

