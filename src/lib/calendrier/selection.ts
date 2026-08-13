import { normaliserJour } from './dates';

/**
 * Which lines belong to the two working screens (cahier des charges §9.1).
 *
 * "Publications imminentes" is what has to be produced very soon; "Produits
 * chargés" is what has already been handed over. Both rules are pure so the
 * boundaries — is today included? is an overdue line imminent? — are settled by
 * a test rather than by whoever last edited the query.
 */

/** Horizon of the "imminentes" screen, in calendar days. */
export const HORIZON_IMMINENT_JOURS = 15;

export type LigneSelectionnable = {
  statut: string;
  dateDiffusionPrevue: Date;
  dateDiffusionReelle: Date | null;
  nombreFichiers: number;
  nombreValeurs: number;
};

function enJours(depuis: Date, jusqua: Date): number {
  return Math.round(
    (normaliserJour(jusqua).getTime() - normaliserJour(depuis).getTime()) /
      86_400_000,
  );
}

/**
 * Days left before the announced date. Negative once it has passed.
 *
 * Counted on calendar days, so a release due today reads 0 whatever the hour.
 */
export function joursAvantEcheance(
  ligne: Pick<LigneSelectionnable, 'dateDiffusionPrevue'>,
  aujourdhui: Date,
): number {
  return enJours(aujourdhui, ligne.dateDiffusionPrevue);
}

/**
 * Is the line due within the horizon?
 *
 * Overdue lines are **excluded**: they have their own screen, and mixing them in
 * would turn a "what is coming" list into a backlog nobody can act on the same
 * way. Delivered, published and cancelled lines are excluded too — there is
 * nothing left to produce.
 */
export function estImminente(
  ligne: LigneSelectionnable,
  aujourdhui: Date,
  horizon: number = HORIZON_IMMINENT_JOURS,
): boolean {
  if (
    ligne.statut === 'TELEVERSE' ||
    ligne.statut === 'MIS_EN_LIGNE' ||
    ligne.statut === 'ANNULE' ||
    ligne.dateDiffusionReelle !== null
  ) {
    return false;
  }

  const restant = joursAvantEcheance(ligne, aujourdhui);

  return restant >= 0 && restant <= horizon;
}

/**
 * Has something already been handed over on this line?
 *
 * A file **or** a filled-in indicator value is enough. Keying on the `TELEVERSE`
 * status alone would hide a publication whose PDF is stored but whose figures
 * are still missing — precisely the line somebody needs to come back to.
 */
export function estChargee(ligne: LigneSelectionnable): boolean {
  if (ligne.statut === 'ANNULE') {
    return false;
  }

  return (
    ligne.nombreFichiers > 0 ||
    ligne.nombreValeurs > 0 ||
    ligne.statut === 'TELEVERSE' ||
    ligne.statut === 'MIS_EN_LIGNE'
  );
}

/**
 * Has the line been handed over in full, or only started?
 *
 * `TELEVERSE` is only written once everything §6 requires is present, so it is
 * the honest marker of a complete delivery.
 */
export function estChargeeIncompletement(ligne: LigneSelectionnable): boolean {
  return (
    estChargee(ligne) &&
    ligne.statut !== 'TELEVERSE' &&
    ligne.statut !== 'MIS_EN_LIGNE'
  );
}

export type Urgence = 'aujourdhui' | 'trois-jours' | 'semaine' | 'plus-tard';

/** How pressing an upcoming deadline is, for the colour of its row. */
export function urgence(restant: number): Urgence {
  if (restant <= 0) {
    return 'aujourdhui';
  }
  if (restant <= 3) {
    return 'trois-jours';
  }
  if (restant <= 7) {
    return 'semaine';
  }

  return 'plus-tard';
}

/** "dans 3 jours", "demain", "aujourd'hui" — as a person would say it. */
export function libelleEcheance(restant: number): string {
  if (restant <= 0) {
    return "aujourd'hui";
  }
  if (restant === 1) {
    return 'demain';
  }

  return `dans ${restant} jours`;
}
