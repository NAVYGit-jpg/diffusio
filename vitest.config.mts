import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Vitest needs the same `@/` alias as the TypeScript compiler and Next.js;
 * it does not read `paths` from tsconfig on its own.
 */
export default defineConfig({
  // tsconfig keeps JSX as-is for Next.js; tests that render PDF documents
  // need it compiled.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
