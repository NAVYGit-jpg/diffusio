import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client.
 *
 * Prisma 7 connects through a driver adapter rather than a datasource URL
 * declared in the schema. We use `DATABASE_URL`, which points at Supabase's
 * pooler. Migrations use `DIRECT_URL` instead, see `prisma.config.ts`.
 *
 * The client is built on **first use**, not when the module loads. Next.js
 * imports every route module while collecting page data, so an eager client
 * turned a missing `DATABASE_URL` into a failed build — the deployment stopped
 * on a credential a build machine has no reason to hold, and never connects to
 * anyway. Deferring it moves the complaint to the first query, which is the
 * moment the address is actually needed.
 *
 * The instance is kept on `globalThis` because Next.js hot-reloads modules in
 * development, and a new pool on every reload ends with the database refusing
 * connections.
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

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

/**
 * Stands in for the client and builds it on the first property read.
 *
 * Every call site keeps writing `prisma.utilisateur.findMany(...)`; nothing had
 * to change. Functions are bound to the real client, without which
 * `prisma.$transaction(...)` would run with the proxy as its `this` and fail
 * inside Prisma rather than here.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_cible, propriete) {
    const reel = client();
    const valeur = Reflect.get(reel, propriete, reel);

    return typeof valeur === 'function' ? valeur.bind(reel) : valeur;
  },
});
