import type { StatutLigne, TypeElement } from '@prisma/client';

import { formaterISO } from './dates';

/**
 * Difference report between an existing calendar and a freshly computed one
 * (cahier des charges §5.5).
 *
 * Three rules dominate everything else here:
 *   - **regenerating never deletes.** Existing lines are kept; the computation
 *     updates those it recognises and adds those it does not. Emptying a
 *     calendar to refill it would throw away every hand-made correction, every
 *     uploaded file and every published link along the way.
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
  dateDebutCouverture: Date;
  dateFinCouverture: Date;
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
  /**
   * Lines the new computation no longer produces — a periodicity that changed,
   * an element unticked. They are **kept**, not deleted, and merely reported:
   * the calendar belongs to the point focal, and only an explicit deletion on
   * the line itself removes it.
   */
  orphelines: LigneExistante[];
};

/** Statuses that mark work already done; those lines are untouchable. */
const STATUTS_INTOUCHABLES: readonly StatutLigne[] = ['TELEVERSE', 'MIS_EN_LIGNE'];

export function estIntouchable(statut: StatutLigne): boolean {
  return STATUTS_INTOUCHABLES.includes(statut);
}

/**
 * Identity of a calendar line: the element, plus the period it covers.
 *
 * The **coverage dates**, not the period label and not the release date.
 *
 * Not the release date, because the whole point of an update is that the date
 * may have moved while still designating the same line. Not the label either:
 * "Janvier 2026" is text derived from the dates, and rewording it — or fixing
 * an accent — would make every line look new and duplicate the whole calendar.
 * The covered period is the fact; the label only describes it.
 *
 * The element is matched by identifier rather than by name, so renaming a
 * publication keeps its calendar attached to it.
 */
function cle(ligne: {
  elementType: TypeElement;
  elementId: string;
  dateDebutCouverture: Date;
  dateFinCouverture: Date;
}): string {
  return [
    ligne.elementType,
    ligne.elementId,
    formaterISO(ligne.dateDebutCouverture),
    formaterISO(ligne.dateFinCouverture),
  ].join('::');
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
    orphelines: [],
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

    // The label is compared too: it is stored, so a line whose wording changed
    // has to be rewritten even when its date has not moved.
    const identique =
      formaterISO(existante.dateDiffusionPrevue) ===
        formaterISO(calculee.dateDiffusionPrevue) &&
      existante.libellePeriode === calculee.libellePeriode;

    if (identique) {
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

    // A line the new computation no longer produces. It is kept whatever its
    // status: regenerating a calendar must never make work disappear, and a
    // point focal who really wants a line gone deletes it from the line itself.
    if (estIntouchable(existante.statut)) {
      rapport.conservees.push(existante);
    } else {
      rapport.orphelines.push(existante);
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

  if (rapport.orphelines.length > 0) {
    lignes.push(
      `${rapport.orphelines.length} ligne(s) conservée(s) hors de ce calcul`,
    );
  }

  if (rapport.inchangees.length > 0) {
    lignes.push(`${rapport.inchangees.length} ligne(s) inchangée(s)`);
  }

  return lignes.length > 0 ? lignes : ['Aucun changement'];
}
