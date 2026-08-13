/**
 * Wording and colour of a calendar line's status (cahier des charges §5, §6, §7).
 *
 * Single source of truth. The labels were duplicated in four places — the
 * calendar table, the Excel export, the dashboard and its export — and renaming
 * "Téléversé" to "Livré" in three of them would have left the fourth quietly
 * disagreeing with the rest of the application.
 *
 * The stored enum values are unchanged: they are written in the database, in
 * the reminder engine and in the regeneration rules. Only what a human reads
 * changes here.
 */

export const STATUTS_LIGNE = [
  'PLANIFIE',
  'A_VENIR',
  'TELEVERSE',
  'MIS_EN_LIGNE',
  'EN_RETARD',
  'ANNULE',
] as const;

export type StatutLigneCalendrier = (typeof STATUTS_LIGNE)[number];

export const LIBELLE_STATUT: Record<StatutLigneCalendrier, string> = {
  PLANIFIE: 'Planifié',
  A_VENIR: 'À venir',
  // The point focal has handed the deliverable over; nothing is public yet.
  TELEVERSE: 'Livré',
  // The administrator has confirmed the release: the publication is out.
  MIS_EN_LIGNE: 'Publié',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulé',
};

/** Plural form, for a count of lines in a chart or a table header. */
export const LIBELLE_STATUT_PLURIEL: Record<StatutLigneCalendrier, string> = {
  PLANIFIE: 'Planifiées',
  A_VENIR: 'À venir',
  TELEVERSE: 'Livrées',
  MIS_EN_LIGNE: 'Publiées',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulées',
};

/**
 * Tailwind classes of the badge shown in the calendar.
 *
 * "Livré" is amber — an intermediate state, waiting on somebody else — while
 * "Publié" is green, the only state that means the work is finished. Written as
 * explicit classes rather than a variant so the amber can be stated once and
 * read the same in light and dark mode.
 */
export const CLASSES_BADGE_STATUT: Record<StatutLigneCalendrier, string> = {
  PLANIFIE: 'border-transparent bg-muted text-muted-foreground',
  A_VENIR: 'border-transparent bg-muted text-muted-foreground',
  TELEVERSE:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200',
  MIS_EN_LIGNE:
    'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200',
  EN_RETARD:
    'border-transparent bg-destructive text-white dark:bg-destructive/70',
  ANNULE: 'border-transparent bg-muted text-muted-foreground line-through',
};

/** Chart colours, matching the badges above. */
export const COULEUR_STATUT: Record<StatutLigneCalendrier, string> = {
  PLANIFIE: 'var(--chart-2)',
  A_VENIR: 'var(--chart-2)',
  TELEVERSE: 'oklch(0.79 0.16 82)',
  MIS_EN_LIGNE: 'oklch(0.62 0.15 155)',
  EN_RETARD: 'var(--destructive)',
  ANNULE: 'var(--chart-1)',
};

/** Falls back to the raw value: an unknown status is shown, never hidden. */
export function libelleStatut(statut: string): string {
  return LIBELLE_STATUT[statut as StatutLigneCalendrier] ?? statut;
}

export function classesBadgeStatut(statut: string): string {
  return (
    CLASSES_BADGE_STATUT[statut as StatutLigneCalendrier] ??
    'border-transparent bg-muted text-muted-foreground'
  );
}

/**
 * Status actually shown to a reader.
 *
 * The stored `EN_RETARD` is written by the nightly job, so a line whose date
 * passed this morning still carries `PLANIFIE` in the database. Displaying that
 * would show "Planifié" next to a deadline six months gone — and contradict the
 * dashboard and the lateness screen, which both read the dates.
 *
 * A delivered or published line is never re-labelled: it left the waiting state
 * for good.
 */
export function statutAffiche(
  ligne: {
    statut: string;
    dateDiffusionPrevue: Date | string;
    dateDiffusionReelle?: Date | string | null;
  },
  aujourdhui: Date = new Date(),
): string {
  if (
    ligne.statut === 'MIS_EN_LIGNE' ||
    ligne.statut === 'TELEVERSE' ||
    ligne.statut === 'ANNULE' ||
    ligne.dateDiffusionReelle
  ) {
    return ligne.statut;
  }

  const prevue = new Date(ligne.dateDiffusionPrevue);

  const jourPrevu = Date.UTC(
    prevue.getUTCFullYear(),
    prevue.getUTCMonth(),
    prevue.getUTCDate(),
  );
  const jourCourant = Date.UTC(
    aujourdhui.getUTCFullYear(),
    aujourdhui.getUTCMonth(),
    aujourdhui.getUTCDate(),
  );

  return jourPrevu < jourCourant ? 'EN_RETARD' : ligne.statut;
}
