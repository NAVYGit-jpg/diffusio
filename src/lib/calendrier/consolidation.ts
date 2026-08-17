/**
 * Sentinel meaning "every structure" or "every year" in the calendar address
 * (cahier des charges §9.3).
 *
 * Declared in a plain module, never in a `'use client'` one. Next.js replaces
 * the exports of a client module with client references: a server component
 * importing this constant from there would compare a string to an object, the
 * test would always be false, and the consolidated view would never open —
 * without a single error to point at it.
 */
export const TOUTES = 'TOUTES';

/** Does this address ask for a consolidated view rather than one calendar? */
export function estConsolide(structure: string, annee: string): boolean {
  return structure === TOUTES || annee === TOUTES;
}
