import { ANNEE_MAX, ANNEE_MIN } from '@/lib/calendrier/annees';

/**
 * Reading the dashboard filters from the URL (cahier des charges §10).
 *
 * Extracted from the page and tested on its own, because query strings arrive
 * in every shape: absent, empty, repeated, or typed by hand. A wrong reading
 * here does not raise an error — it silently shows the wrong year, which is far
 * worse on a screen whose whole purpose is to be trusted.
 */

export type ParametresBruts = Record<string, string | string[] | undefined>;

export type FiltresLus = {
  annee: number;
  structureId: string | null;
  domaineId: string | null;
  periodicite: string | null;
};

/**
 * One value out of the query string.
 *
 * `?structure=a&structure=b` yields an array; the first value wins. An empty or
 * blank value means "no filter", exactly like an absent key.
 */
export function lireParametre(
  parametres: ParametresBruts,
  cle: string,
): string | null {
  const valeur = parametres[cle];
  const brut = Array.isArray(valeur) ? valeur[0] : valeur;

  return typeof brut === 'string' && brut.trim() !== '' ? brut.trim() : null;
}

/**
 * Year of the dashboard.
 *
 * Guards against `Number(null) === 0`, which silently produced a "year 0", and
 * against any value outside the range offered elsewhere in the application
 * (DEC-108). Anything unusable falls back to the default year rather than
 * raising: a dashboard must always be able to draw something.
 */
export function lireAnnee(
  parametres: ParametresBruts,
  anneeParDefaut: number,
): number {
  const brut = lireParametre(parametres, 'annee');

  if (brut === null) {
    return anneeParDefaut;
  }

  const valeur = Number(brut);

  if (!Number.isInteger(valeur) || valeur < ANNEE_MIN || valeur > ANNEE_MAX) {
    return anneeParDefaut;
  }

  return valeur;
}

/** The default year: the current one, brought back inside the offered range. */
export function anneeParDefaut(maintenant: Date = new Date()): number {
  const courante = maintenant.getUTCFullYear();

  return Math.min(ANNEE_MAX, Math.max(ANNEE_MIN, courante));
}

export function lireFiltres(
  parametres: ParametresBruts,
  maintenant: Date = new Date(),
): FiltresLus {
  return {
    annee: lireAnnee(parametres, anneeParDefaut(maintenant)),
    structureId: lireParametre(parametres, 'structure'),
    domaineId: lireParametre(parametres, 'domaine'),
    periodicite: lireParametre(parametres, 'periodicite'),
  };
}

/**
 * Years offered in the selector.
 *
 * Built from the years that actually carry a calendar, plus the selected one so
 * the dropdown can always display its own value. Sorted newest first, and
 * filtered to the valid range so a stray row in the database cannot put a "0"
 * in the list.
 */
export function anneesProposees(
  anneesEnBase: readonly number[],
  anneeSelectionnee: number,
): number[] {
  const valides = new Set(
    [...anneesEnBase, anneeSelectionnee].filter(
      (annee) =>
        Number.isInteger(annee) && annee >= ANNEE_MIN && annee <= ANNEE_MAX,
    ),
  );

  return [...valides].sort((a, b) => b - a);
}
