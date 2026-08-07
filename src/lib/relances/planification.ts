import type { StatutLigne, TypeEnvoiEmail } from '@prisma/client';

import { normaliserJour } from '@/lib/calendrier/dates';

/**
 * Reminder and chase scheduling (cahier des charges §8).
 *
 * Decides **what should go out today**, and nothing else: no database, no
 * e-mail. The daily cron reads these decisions and acts on them, which is what
 * makes a whole month simulable in a test.
 */

/**
 * Reminder slots.
 *
 * ⚠️ The specification asks for two things at once: named types
 * `RAPPEL_J15…RAPPEL_J1` (§4.9) and reminder days configurable by the super
 * admin (§9.3). Both cannot hold literally — a delay changed to 20 days has no
 * matching name. The enum is therefore read as a **rank**: the first configured
 * reminder is `RAPPEL_J15`, the second `RAPPEL_J10`, and so on. The stored
 * label is only there to make a message unique per line and per day, which is
 * what the anti-duplicate constraint needs (voir DECISIONS.md, DEC-116).
 */
export const RANGS_RAPPEL: TypeEnvoiEmail[] = [
  'RAPPEL_J15',
  'RAPPEL_J10',
  'RAPPEL_J5',
  'RAPPEL_J3',
  'RAPPEL_J1',
];

/** Statuses meaning the work is done: no reminder, no chase. */
const STATUTS_TRAITES: readonly StatutLigne[] = ['TELEVERSE', 'MIS_EN_LIGNE'];

export function estTraitee(statut: StatutLigne): boolean {
  return STATUTS_TRAITES.includes(statut);
}

/** Whole days from `depuis` to `jusqua`; negative once the date is passed. */
export function joursEntre(depuis: Date, jusqua: Date): number {
  const a = normaliserJour(depuis).getTime();
  const b = normaliserJour(jusqua).getTime();

  return Math.round((b - a) / 86_400_000);
}

export type Rappel = {
  type: TypeEnvoiEmail;
  joursRestants: number;
};

/**
 * Reminder due today for a line, if any (§8.1).
 *
 * Configured days are read in descending order so the ranks stay stable
 * whatever order the super admin typed them in.
 */
export function rappelDuJour(params: {
  dateDiffusionPrevue: Date;
  aujourdhui: Date;
  statut: StatutLigne;
  joursRappel: readonly number[];
}): Rappel | null {
  if (estTraitee(params.statut)) {
    return null;
  }

  const joursRestants = joursEntre(params.aujourdhui, params.dateDiffusionPrevue);

  if (joursRestants <= 0) {
    return null;
  }

  const configures = [...new Set(params.joursRappel)]
    .filter((jour) => Number.isInteger(jour) && jour > 0)
    .sort((a, b) => b - a);

  const rang = configures.indexOf(joursRestants);

  if (rang === -1) {
    return null;
  }

  return {
    // Beyond the five named slots the last one is reused: the message still
    // goes out, and the anti-duplicate constraint still holds per day.
    type: RANGS_RAPPEL[Math.min(rang, RANGS_RAPPEL.length - 1)],
    joursRestants,
  };
}

export type EtatRetard = {
  relancesSuspendues: boolean;
  prochaineDateDiffusion: Date | null;
  publie: boolean;
};

export type DecisionRelance = {
  /** Should a chase go out today? */
  relancer: boolean;
  /** Days past the date that was missed. */
  joursDeRetard: number;
  /** The date being chased: the initial one, or the announced replacement. */
  dateDeReference: Date;
};

/**
 * Chase decision for an overdue line (§8.2).
 *
 * Rules, in order:
 *   - a delivered or published line is never chased;
 *   - a chase goes out every `frequenceJours` from the missed date;
 *   - filling in a justification **and** a next date suspends the chases;
 *   - if that announced date is itself missed, chases resume two days after
 *     it, then at the same frequency.
 */
export function decisionRelance(params: {
  dateDiffusionPrevue: Date;
  aujourdhui: Date;
  statut: StatutLigne;
  retard: EtatRetard | null;
  frequenceJours: number;
}): DecisionRelance {
  const frequence = Math.max(1, Math.trunc(params.frequenceJours));
  const suspendu = params.retard?.relancesSuspendues ?? false;
  const prochaine = params.retard?.prochaineDateDiffusion ?? null;

  // The date actually being chased.
  const reference = suspendu && prochaine ? prochaine : params.dateDiffusionPrevue;
  const joursDeRetard = joursEntre(reference, params.aujourdhui);

  const base: DecisionRelance = {
    relancer: false,
    joursDeRetard,
    dateDeReference: reference,
  };

  if (estTraitee(params.statut) || params.retard?.publie) {
    return base;
  }

  if (joursDeRetard <= 0) {
    // Not overdue yet — either the initial date, or a still-future promise.
    return base;
  }

  if (suspendu && prochaine) {
    // §8.2 — chases resume two days after the announced date is missed.
    const DELAI_REPRISE = 2;

    if (joursDeRetard < DELAI_REPRISE) {
      return base;
    }

    return {
      ...base,
      relancer: (joursDeRetard - DELAI_REPRISE) % frequence === 0,
    };
  }

  if (suspendu) {
    // Suspended without an announced date: nothing to resume on.
    return base;
  }

  return { ...base, relancer: joursDeRetard % frequence === 0 };
}

/** Does this line become `EN_RETARD` today? */
export function passeEnRetard(params: {
  dateDiffusionPrevue: Date;
  aujourdhui: Date;
  statut: StatutLigne;
}): boolean {
  if (estTraitee(params.statut) || params.statut === 'ANNULE') {
    return false;
  }

  if (params.statut === 'EN_RETARD') {
    return false;
  }

  return joursEntre(params.dateDiffusionPrevue, params.aujourdhui) > 0;
}

/** Wording of the remaining time, for the message body (§8.1). */
export function libelleJoursRestants(jours: number): string {
  if (jours === 1) {
    return 'demain';
  }

  return `dans ${jours} jours`;
}

export function libelleRetard(jours: number): string {
  if (jours === 1) {
    return "depuis 1 jour";
  }

  return `depuis ${jours} jours`;
}
