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

export type TypeElement = 'PUBLICATION' | 'INDICATEUR';

export const TYPES_ELEMENT: readonly TypeElement[] = [
  'PUBLICATION',
  'INDICATEUR',
];

export const LIBELLE_TYPE_ELEMENT: Record<TypeElement, string> = {
  PUBLICATION: 'Publication',
  INDICATEUR: 'Indicateur',
};

/** The twelve months, 1-based, as people write and say them. */
export const MOIS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Full month names.
 *
 * The curve on the same screen abbreviates them for want of room under a tick;
 * a dropdown has the room, and « Juin » next to « Juil » is a hesitation the
 * reader should not have to resolve.
 */
export const LIBELLE_MOIS: Record<number, string> = {
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Août',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre',
};

/**
 * Every categorical filter holds a list. An **empty list means "everything"**,
 * never "nothing": a filter starts out open, and treating the empty case as an
 * exclusion would show a blank dashboard the moment somebody unticks the last
 * box.
 */
export type FiltresLus = {
  annee: number;
  mois: number[];
  structureIds: string[];
  domaineIds: string[];
  periodicites: string[];
  typesElement: TypeElement[];
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
 * Every value carried by one key.
 *
 * Accepts both forms a query string can take: repeated keys
 * (`?domaine=a&domaine=b`) and a comma-separated list (`?domaine=a,b`), because
 * a URL edited by hand or trimmed by a mail client may arrive either way.
 * Duplicates are removed and blanks dropped.
 */
export function lireParametres(
  parametres: ParametresBruts,
  cle: string,
): string[] {
  const valeur = parametres[cle];

  if (valeur === undefined) {
    return [];
  }

  const brut = Array.isArray(valeur) ? valeur : [valeur];

  const valeurs = brut
    .flatMap((element) => element.split(','))
    .map((element) => element.trim())
    .filter((element) => element !== '');

  return [...new Set(valeurs)];
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

/**
 * Months of the dashboard.
 *
 * Unlike the year, several months can be looked at at once — a quarter, a
 * campaign, the two months a survey straddles. Anything that is not a whole
 * number between 1 and 12 is dropped rather than clamped: `?mois=0` and
 * `?mois=13` are typing mistakes, and quietly turning them into January or
 * December would answer a question nobody asked.
 *
 * The result is sorted, so the chips and the URL read January to December
 * whatever order the boxes were ticked in.
 */
export function lireMois(parametres: ParametresBruts): number[] {
  const valeurs = lireParametres(parametres, 'mois')
    .map((brut) => Number(brut))
    .filter((valeur) => Number.isInteger(valeur) && valeur >= 1 && valeur <= 12);

  return [...new Set(valeurs)].sort((a, b) => a - b);
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
    mois: lireMois(parametres),
    structureIds: lireParametres(parametres, 'structure'),
    domaineIds: lireParametres(parametres, 'domaine'),
    periodicites: lireParametres(parametres, 'periodicite'),
    // Anything that is not one of the two known types is dropped rather than
    // passed to the query: an unknown value would silently return nothing.
    typesElement: lireParametres(parametres, 'type').filter(
      (valeur): valeur is TypeElement =>
        (TYPES_ELEMENT as readonly string[]).includes(valeur),
    ),
  };
}

/** Builds the dashboard address from a set of filters. */
export function adresseTableauDeBord(filtres: FiltresLus): string {
  const parametres = new URLSearchParams();

  parametres.set('annee', String(filtres.annee));

  const ajouter = (cle: string, valeurs: readonly string[]) => {
    for (const valeur of valeurs) {
      parametres.append(cle, valeur);
    }
  };

  ajouter('mois', filtres.mois.map(String));
  ajouter('structure', filtres.structureIds);
  ajouter('domaine', filtres.domaineIds);
  ajouter('periodicite', filtres.periodicites);
  ajouter('type', filtres.typesElement);

  return `/tableau-de-bord?${parametres.toString()}`;
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
