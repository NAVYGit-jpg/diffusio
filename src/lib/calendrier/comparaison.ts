import type { StatutLigne, TypeElement } from '@prisma/client';

import { formaterISO } from './dates';

/**
 * Difference report between an existing calendar and a freshly computed one
 * (cahier des charges §5.5).
 *
 * Two rules dominate everything else here:
 *   - a line already `TELEVERSE` or `MIS_EN_LIGNE` is **never** touched. The
 *     specification forbids it (§14) and it would destroy work already done.
 *   - a line edited by hand is not overwritten silently; it is listed so the
 *     user decides.
 *
 * Nothing is written by this module: it only describes what an update would do,
 * so the interface can show it before anything happens.
 */

export type LigneExistante = {
  id: string;
  elementType: TypeElement;
  elementId: string;
  libellePeriode: string;
  dateDiffusionPrevue: Date;
  statut: StatutLigne;
  modifieManuellement: boolean;
};

export type LigneCalculee = {
  elementType: TypeElement;
  elementId: string;
  libellePeriode: string;
  dateDebutCouverture: Date;
  dateFinCouverture: Date;
  dateDiffusionPrevue: Date;
};

export type LigneModifiee = {
  existante: LigneExistante;
  calculee: LigneCalculee;
};

export type RapportComparaison = {
  aAjouter: LigneCalculee[];
  aModifier: LigneModifiee[];
  /** Hand-edited lines whose date would change: need explicit confirmation. */
  aConfirmer: LigneModifiee[];
  /** Already delivered or published: kept as they are, whatever happens. */
  conservees: LigneExistante[];
  inchangees: LigneExistante[];
  aSupprimer: LigneExistante[];
};

/** Statuses that mark work already done; those lines are untouchable. */
const STATUTS_INTOUCHABLES: readonly StatutLigne[] = ['TELEVERSE', 'MIS_EN_LIGNE'];

export function estIntouchable(statut: StatutLigne): boolean {
  return STATUTS_INTOUCHABLES.includes(statut);
}

/**
 * Identity of a calendar line.
 *
 * An element plus a period, not the date: the whole point of an update is that
 * the date may have moved while still designating the same line.
 */
function cle(ligne: {
  elementType: TypeElement;
  elementId: string;
  libellePeriode: string;
}): string {
  return `${ligne.elementType}::${ligne.elementId}::${ligne.libellePeriode}`;
}

export function comparerCalendrier(
  existantes: readonly LigneExistante[],
  calculees: readonly LigneCalculee[],
): RapportComparaison {
  const parCle = new Map<string, LigneExistante>();

  for (const ligne of existantes) {
    parCle.set(cle(ligne), ligne);
  }

  const rapport: RapportComparaison = {
    aAjouter: [],
    aModifier: [],
    aConfirmer: [],
    conservees: [],
    inchangees: [],
    aSupprimer: [],
  };

  const clesVues = new Set<string>();

  for (const calculee of calculees) {
    const identifiant = cle(calculee);
    clesVues.add(identifiant);

    const existante = parCle.get(identifiant);

    if (!existante) {
      rapport.aAjouter.push(calculee);
      continue;
    }

    if (estIntouchable(existante.statut)) {
      rapport.conservees.push(existante);
      continue;
    }

    const memeDate =
      formaterISO(existante.dateDiffusionPrevue) ===
      formaterISO(calculee.dateDiffusionPrevue);

    if (memeDate) {
      rapport.inchangees.push(existante);
      continue;
    }

    if (existante.modifieManuellement) {
      rapport.aConfirmer.push({ existante, calculee });
    } else {
      rapport.aModifier.push({ existante, calculee });
    }
  }

  for (const existante of existantes) {
    if (clesVues.has(cle(existante))) {
      continue;
    }

    // A line no longer produced by the element — periodicity changed, for
    // instance. Already-delivered ones are kept rather than deleted.
    if (estIntouchable(existante.statut)) {
      rapport.conservees.push(existante);
    } else {
      rapport.aSupprimer.push(existante);
    }
  }

  return rapport;
}

/** Human summary of the report, for the confirmation screen. */
export function resumerComparaison(rapport: RapportComparaison): string[] {
  const lignes: string[] = [];

  if (rapport.aAjouter.length > 0) {
    lignes.push(`${rapport.aAjouter.length} ligne(s) ajoutée(s)`);
  }

  if (rapport.aModifier.length > 0) {
    lignes.push(`${rapport.aModifier.length} date(s) recalculée(s)`);
  }

  if (rapport.aConfirmer.length > 0) {
    lignes.push(
      `${rapport.aConfirmer.length} ligne(s) modifiée(s) à la main : confirmation requise`,
    );
  }

  if (rapport.conservees.length > 0) {
    lignes.push(
      `${rapport.conservees.length} ligne(s) conservée(s) car déjà traitée(s)`,
    );
  }

  if (rapport.aSupprimer.length > 0) {
    lignes.push(`${rapport.aSupprimer.length} ligne(s) supprimée(s)`);
  }

  if (rapport.inchangees.length > 0) {
    lignes.push(`${rapport.inchangees.length} ligne(s) inchangée(s)`);
  }

  return lignes.length > 0 ? lignes : ['Aucun changement'];
}
