import { HORIZON_IMMINENT_JOURS } from '@/lib/calendrier/selection';

/**
 * Badge rules for the navigation tabs (cahier des charges §9.5).
 *
 * One rule for every tab: **the badge counts what appeared there since the
 * reader last opened it**, exactly as the bell counts unread notifications.
 * Opening the tab clears it.
 *
 * "Appeared" is not always a creation. A calendar line is created once but
 * shows up in "Publications imminentes" only when its deadline comes within
 * fifteen days, and in "Publications en retard" only when that deadline
 * passes. Those moments are computable from the line's own date, which is what
 * `dateEntreeImminente` and `dateEntreeRetard` give — no extra bookkeeping, and
 * no badge that lights up for something the reader has already seen.
 *
 * Pure module: no database, no React. The counting queries live next door and
 * lean on these definitions.
 */

/** Tabs that can carry a badge, keyed by their address. */
export const ONGLETS_AVEC_COMPTEUR = [
  '/structures',
  '/utilisateurs',
  '/catalogue',
  '/calendrier',
  '/imminentes',
  '/produits-charges',
  '/retards',
  '/equipe',
  '/notifications',
  '/discussion',
] as const;

export type OngletCompte = (typeof ONGLETS_AVEC_COMPTEUR)[number];

export function porteUnCompteur(href: string): href is OngletCompte {
  return (ONGLETS_AVEC_COMPTEUR as readonly string[]).includes(href);
}

/**
 * Moment a calendar line enters the "imminent" tab: fifteen days before it is
 * due.
 */
export function dateEntreeImminente(
  dateDiffusionPrevue: Date,
  horizon: number = HORIZON_IMMINENT_JOURS,
): Date {
  const entree = new Date(dateDiffusionPrevue.getTime());
  entree.setUTCDate(entree.getUTCDate() - horizon);

  return entree;
}

/**
 * Moment a line enters the "overdue" tab.
 *
 * The day after its deadline: a release due today is not late yet, a rule the
 * whole application already follows.
 */
export function dateEntreeRetard(dateDiffusionPrevue: Date): Date {
  const entree = new Date(dateDiffusionPrevue.getTime());
  entree.setUTCDate(entree.getUTCDate() + 1);

  return entree;
}

/**
 * Has this item appeared since the last visit?
 *
 * A tab never opened has no recorded visit: everything in it is new, which is
 * what somebody discovering the application should see.
 */
export function apparuDepuis(
  apparition: Date,
  derniereVisite: Date | null,
): boolean {
  return derniereVisite === null || apparition > derniereVisite;
}

/** Badge text. Beyond 99 the exact number stops helping and starts crowding. */
export function formaterCompteur(nombre: number): string | null {
  if (nombre <= 0) {
    return null;
  }

  return nombre > 99 ? '99+' : String(nombre);
}

/** Spoken form for screen readers, appended to the tab name. */
export function libelleCompteur(nombre: number): string {
  if (nombre <= 0) {
    return '';
  }

  return nombre === 1 ? '1 nouvel élément' : `${nombre} nouveaux éléments`;
}
