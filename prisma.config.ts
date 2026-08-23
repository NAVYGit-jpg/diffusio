import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

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
 *
 * The datasource is declared **only when the variable is set**, rather than
 * through `env('DIRECT_URL')`, which throws as the config file loads. Drawing
 * the client needs no database at all — it reads the schema — but a build
 * machine has no reason to hold a migration credential, and on Vercel that
 * throw stopped the build before a single file was compiled. Declaring nothing
 * lets `generate` proceed; the commands that genuinely need a connection still
 * say so when the variable is missing.
 */
const urlMigrations = process.env.DIRECT_URL;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),

  ...(urlMigrations ? { datasource: { url: urlMigrations } } : {}),

  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'npx tsx prisma/seed.ts',
  },
});
