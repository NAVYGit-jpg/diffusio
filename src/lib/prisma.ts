import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client.
 *
 * Prisma 7 connects through a driver adapter rather than a datasource URL
 * declared in the schema. We use `DATABASE_URL`, which points at Supabase's
 * transaction pooler (port 6543) — the right endpoint for short-lived
 * serverless invocations. Migrations use `DIRECT_URL` instead, see
 * `prisma.config.ts`.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * pool on every reload until the database refuses connections. Caching the
 * instance on `globalThis` keeps a single pool alive across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "La variable d'environnement DATABASE_URL n'est pas definie. " +
        'Copiez .env.example vers .env et renseignez la chaine de connexion Supabase.',
    );
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
