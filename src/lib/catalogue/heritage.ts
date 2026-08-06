import type { Periodicite, TypeDelai } from '@prisma/client';

import { nombreDeLignes } from '@/lib/calendrier/moteur';

/**
 * Inheritance rule for affiliated indicators (cahier des charges §4.5).
 *
 * An indicator attached to a publication does not carry its own schedule: it
 * takes the publication's domain, periodicity and lead time, and follows them
 * whenever the publication changes. An indicator with no publication carries
 * its own values, which then become mandatory.
 *
 * This is the rule the specification calls "essentielle", so it lives in its
 * own module with no database or framework dependency.
 */

/** Fields an affiliated indicator never owns. */
export const CHAMPS_HERITES = [
  'domaineId',
  'periodicite',
  'nombreAnneesPeriodicite',
  'delaiJours',
  'delaiType',
  'reportSiWeekendOuFerie',
] as const;

export type ChampHerite = (typeof CHAMPS_HERITES)[number];

export type ValeursPlanification = {
  domaineId: string;
  periodicite: Periodicite;
  nombreAnneesPeriodicite: number | null;
  delaiJours: number;
  delaiType: TypeDelai;
  reportSiWeekendOuFerie: boolean;
};

export type ErreurChamp = { champ: string; message: string };

/**
 * Produces the values to store for an indicator.
 *
 * When `publication` is present its values win, whatever the form sent: the
 * fields are displayed read-only, but a crafted request could still carry
 * something else.
 */
export function appliquerHeritage(
  saisie: ValeursPlanification,
  publication: ValeursPlanification | null,
): ValeursPlanification {
  if (publication === null) {
    return saisie;
  }

  return {
    domaineId: publication.domaineId,
    periodicite: publication.periodicite,
    nombreAnneesPeriodicite: publication.nombreAnneesPeriodicite,
    delaiJours: publication.delaiJours,
    delaiType: publication.delaiType,
    reportSiWeekendOuFerie: publication.reportSiWeekendOuFerie,
  };
}

/**
 * Checks the scheduling fields.
 *
 * `PLURIANNUELLE` is the only periodicity that needs a number of years; asking
 * for one elsewhere, or omitting it there, would make the calendar engine
 * produce nonsense.
 */
export function validerPlanification(
  valeurs: Pick<
    ValeursPlanification,
    'periodicite' | 'nombreAnneesPeriodicite' | 'delaiJours'
  >,
): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];

  if (valeurs.periodicite === 'PLURIANNUELLE') {
    const annees = valeurs.nombreAnneesPeriodicite;

    if (annees === null || annees === undefined) {
      erreurs.push({
        champ: 'nombreAnneesPeriodicite',
        message:
          'Indiquez tous les combien d’années cette publication paraît (par exemple 5).',
      });
    } else if (!Number.isInteger(annees) || annees < 2) {
      erreurs.push({
        champ: 'nombreAnneesPeriodicite',
        message: 'Le nombre d’années doit être un entier supérieur ou égal à 2.',
      });
    } else if (annees > 50) {
      erreurs.push({
        champ: 'nombreAnneesPeriodicite',
        message: 'Le nombre d’années ne peut pas dépasser 50.',
      });
    }
  } else if (
    valeurs.nombreAnneesPeriodicite !== null &&
    valeurs.nombreAnneesPeriodicite !== undefined
  ) {
    erreurs.push({
      champ: 'nombreAnneesPeriodicite',
      message:
        'Le nombre d’années ne s’applique qu’à une périodicité pluriannuelle.',
    });
  }

  if (!Number.isInteger(valeurs.delaiJours)) {
    erreurs.push({
      champ: 'delaiJours',
      message: 'Le délai de mise à disposition doit être un nombre entier de jours.',
    });
  } else if (valeurs.delaiJours < 0) {
    erreurs.push({
      champ: 'delaiJours',
      message: 'Le délai de mise à disposition ne peut pas être négatif.',
    });
  } else if (valeurs.delaiJours > 3650) {
    erreurs.push({
      champ: 'delaiJours',
      message: 'Le délai de mise à disposition ne peut pas dépasser 3650 jours (10 ans).',
    });
  }

  return erreurs;
}

/**
 * Did a publication change in a way that its affiliated indicators must follow?
 *
 * Renaming a publication changes nothing for them; changing its periodicity
 * changes everything. Comparing avoids rewriting rows for nothing.
 */
export function heritageADiverge(
  avant: ValeursPlanification,
  apres: ValeursPlanification,
): boolean {
  return CHAMPS_HERITES.some((champ) => avant[champ] !== apres[champ]);
}

/**
 * Number of calendar lines an element produces for one year.
 *
 * Delegates to the engine rather than reimplementing the split: two
 * independent counts would eventually disagree, and the preview shown before
 * generating (§5.4) would then lie about what is about to be created.
 */
export function nombreDeLignesParAn(
  periodicite: Periodicite,
  nombreAnnees: number | null,
  annee: number,
): number {
  return nombreDeLignes(periodicite, nombreAnnees, annee);
}
