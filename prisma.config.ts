import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * Connection URLs no longer live in `schema.prisma`:
 *   - this file provides the URL used by the CLI (migrate, db pull, studio);
 *   - the application runtime connects through the pg driver adapter, see
 *     `src/lib/prisma.ts`.
 *
 * Supabase exposes two endpoints. Migrations must use the DIRECT connection
 * (port 5432) because the transaction pooler (port 6543) does not support the
 * prepared statements and advisory locks that Prisma Migrate relies on.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  datasource: {
    url: env('DIRECT_URL'),
  },

  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'npx tsx prisma/seed.ts',
  },
});
