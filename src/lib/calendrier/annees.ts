/**
 * Range of years offered when generating a calendar (DEC-108).
 *
 * Kept out of the server-action module: a `'use server'` file may only export
 * async functions, so a plain constant declared there breaks the build.
 */
export const ANNEE_MIN = 2026;
export const ANNEE_MAX = 2126;

export const ANNEES_DISPONIBLES = Array.from(
  { length: ANNEE_MAX - ANNEE_MIN + 1 },
  (_, index) => ANNEE_MIN + index,
);
