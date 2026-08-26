import { estImminente } from '@/lib/calendrier/selection';
import { normaliserJour } from '@/lib/calendrier/dates';

/**
 * Dashboard indicators (cahier des charges §10).
 *
 * Pure computation over a flat list of calendar lines: no database, no Prisma,
 * no React. Every figure shown to a user is decided here and can therefore be
 * unit-tested, which matters because these numbers rank structures against one
 * another.
 *
 * Two rules are worth stating once, since every function below relies on them:
 *
 * 1. `dateDiffusionPrevue` is the date **published in the validated calendar**.
 *    A postponement is recorded in `Retard.prochaineDateDiffusion` and never
 *    overwrites it — so announcing a new date can never repair a missed
 *    deadline, and the respect rate cannot be inflated by postponing.
 *
 * 2. Comparisons are made on the calendar **day**. `dateDiffusionReelle` is an
 *    instant (the moment the administrator confirmed the release), while
 *    `dateDiffusionPrevue` is a day at midnight. Comparing the raw values would
 *    make a release published at 10 a.m. on the due date count as late.
 */

export type LigneIndicateur = {
  id: string;
  structureId: string;
  structureNom: string;
  domaine: string | null;
  periodicite: string;
  elementType: 'PUBLICATION' | 'INDICATEUR';
  dateDiffusionPrevue: Date;
  dateDiffusionReelle: Date | null;
  statut: string;
  /** `null` when no lateness record exists for the line. */
  retardPublie: boolean | null;
};

/** Was the line actually released, whatever the date? */
export function estMiseEnLigne(ligne: LigneIndicateur): boolean {
  return ligne.dateDiffusionReelle !== null;
}

/** Has the announced date passed? The due date itself is not yet overdue. */
export function estEchue(ligne: LigneIndicateur, aujourdhui: Date): boolean {
  return (
    normaliserJour(ligne.dateDiffusionPrevue).getTime() <
    normaliserJour(aujourdhui).getTime()
  );
}

/** Released on the announced day or earlier. */
export function estRespectee(ligne: LigneIndicateur): boolean {
  if (ligne.dateDiffusionReelle === null) {
    return false;
  }

  return (
    normaliserJour(ligne.dateDiffusionReelle).getTime() <=
    normaliserJour(ligne.dateDiffusionPrevue).getTime()
  );
}

export type TauxRespect = {
  /** Lines whose date has passed, plus lines released ahead of a future date. */
  base: number;
  respectees: number;
  /** `null` when nothing is comparable yet — never 0 %, which would read as a failure. */
  taux: number | null;
};

/**
 * Respect rate (§10).
 *
 * The denominator holds every line the organisation can already be judged on:
 * those whose date has passed, and those already released even if their date is
 * still ahead. A line released early would otherwise vanish from the numerator
 * and from the denominator at once, and doing well would change nothing.
 *
 * Cancelled lines are excluded upstream by `lignesComparables`.
 */
export function tauxRespect(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): TauxRespect {
  const comparables = lignes.filter(
    (ligne) => estEchue(ligne, aujourdhui) || estMiseEnLigne(ligne),
  );

  const respectees = comparables.filter(estRespectee).length;

  return {
    base: comparables.length,
    respectees,
    taux:
      comparables.length === 0
        ? null
        : Math.round((respectees / comparables.length) * 1000) / 10,
  };
}

/**
 * Lateness of a line, in days.
 *
 * A released line is measured against its actual release; a line still missing
 * is measured against today, so the figure keeps growing as long as nothing is
 * delivered. Returns 0 for a line that is not late.
 */
export function retardEnJours(
  ligne: LigneIndicateur,
  aujourdhui: Date,
): number {
  const prevue = normaliserJour(ligne.dateDiffusionPrevue).getTime();
  const reference = normaliserJour(
    ligne.dateDiffusionReelle ?? aujourdhui,
  ).getTime();

  const ecart = Math.round((reference - prevue) / 86_400_000);

  return ecart > 0 ? ecart : 0;
}

export type StatistiquesRetard = {
  nombre: number;
  moyen: number | null;
  maximum: number | null;
};

/** Average and worst lateness over the lines actually late (§10). */
export function statistiquesRetard(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): StatistiquesRetard {
  const retards = lignes
    .map((ligne) => retardEnJours(ligne, aujourdhui))
    .filter((jours) => jours > 0);

  if (retards.length === 0) {
    return { nombre: 0, moyen: null, maximum: null };
  }

  const total = retards.reduce((somme, jours) => somme + jours, 0);

  return {
    nombre: retards.length,
    moyen: Math.round((total / retards.length) * 10) / 10,
    maximum: Math.max(...retards),
  };
}

export type Echeances = { j7: number; j15: number; j30: number };

/**
 * Upcoming deadlines at 7 / 15 / 30 days (§10).
 *
 * The windows are cumulative — everything due within 7 days is also due within
 * 30 — because that is how the figures are read side by side.
 *
 * The rule itself is **not written here**: it is `estImminente`, the very
 * function the « Publications imminentes » screen selects with. This count used
 * to apply its own, looser rule — it excluded only released lines, and so kept
 * counting deliverables already filed and calendars already cancelled. A tile
 * announcing four deadlines next to a screen listing two is the kind of
 * disagreement that costs an afternoon, and the dashboard had already produced
 * it once over late releases.
 */
export function prochainesEcheances(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): Echeances {
  const compter = (fenetre: number) =>
    lignes.filter((ligne) => estImminente(ligne, aujourdhui, fenetre)).length;

  return { j7: compter(7), j15: compter(15), j30: compter(30) };
}

export type Part = { libelle: string; nombre: number };

/**
 * Breakdown by a categorical key (§10).
 *
 * Sorted by decreasing count, then alphabetically so equal counts keep a stable
 * order between two page loads.
 */
export function repartition(
  lignes: readonly LigneIndicateur[],
  cle: (ligne: LigneIndicateur) => string,
): Part[] {
  const comptes = new Map<string, number>();

  for (const ligne of lignes) {
    const libelle = cle(ligne);
    comptes.set(libelle, (comptes.get(libelle) ?? 0) + 1);
  }

  return [...comptes.entries()]
    .map(([libelle, nombre]) => ({ libelle, nombre }))
    .sort(
      (a, b) => b.nombre - a.nombre || a.libelle.localeCompare(b.libelle, 'fr'),
    );
}

export type PointMensuel = {
  mois: number;
  libelle: string;
  base: number;
  taux: number | null;
};

const MOIS_COURTS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
];

/**
 * Month-by-month curve of the respect rate (§10).
 *
 * A line belongs to the month it was **due**, not the month it was released:
 * the question the curve answers is "did what was promised for March arrive on
 * time?". Months with nothing due carry `null` rather than 0 — a flat zero
 * would draw a collapse where there was simply nothing to publish.
 *
 * `moisRetenus` narrows the axis to the months being looked at. Empty means the
 * whole year. Drawing the other eleven months as empty next to a report filtered
 * on January would suggest the year collapsed everywhere else, when in truth
 * nothing else was asked for.
 */
export function evolutionMensuelle(
  lignes: readonly LigneIndicateur[],
  annee: number,
  aujourdhui: Date,
  moisRetenus: readonly number[] = [],
): PointMensuel[] {
  const axe =
    moisRetenus.length === 0
      ? Array.from({ length: 12 }, (_, index) => index + 1)
      : [...new Set(moisRetenus)].sort((a, b) => a - b);

  return axe.map((mois) => {
    const duMois = lignes.filter((ligne) => {
      const prevue = normaliserJour(ligne.dateDiffusionPrevue);

      return (
        prevue.getUTCFullYear() === annee && prevue.getUTCMonth() + 1 === mois
      );
    });

    const { base, taux } = tauxRespect(duMois, aujourdhui);

    return { mois, libelle: MOIS_COURTS[mois - 1], base, taux };
  });
}

export type RangStructure = {
  structureId: string;
  structureNom: string;
  base: number;
  respectees: number;
  taux: number | null;
  retards: number;
};

/**
 * Structure ranking (§10, admin and super admin only).
 *
 * Structures with nothing comparable yet are kept but pushed to the end: they
 * are not the best, they are simply not measurable, and dropping them would
 * hide a structure that has published nothing at all.
 */
export function classementStructures(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): RangStructure[] {
  const parStructure = new Map<string, LigneIndicateur[]>();

  for (const ligne of lignes) {
    const groupe = parStructure.get(ligne.structureId);

    if (groupe) {
      groupe.push(ligne);
    } else {
      parStructure.set(ligne.structureId, [ligne]);
    }
  }

  return [...parStructure.entries()]
    .map(([structureId, groupe]) => {
      const { base, respectees, taux } = tauxRespect(groupe, aujourdhui);

      return {
        structureId,
        structureNom: groupe[0].structureNom,
        base,
        respectees,
        taux,
        retards: groupe.filter((ligne) => retardEnJours(ligne, aujourdhui) > 0)
          .length,
      };
    })
    .sort((a, b) => {
      if (a.taux === null && b.taux === null) {
        return a.structureNom.localeCompare(b.structureNom, 'fr');
      }
      if (a.taux === null) {
        return 1;
      }
      if (b.taux === null) {
        return -1;
      }

      return b.taux - a.taux || a.structureNom.localeCompare(b.structureNom, 'fr');
    });
}

export type EtatRetards = {
  total: number;
  /** Late, then released anyway. */
  publieesApresEcheance: number;
  /** Still missing today. */
  nonPubliees: number;
};

/** "En retard non publiées" vs "publiées après échéance" (§10). */
export function etatRetards(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): EtatRetards {
  const enRetard = lignes.filter(
    (ligne) => retardEnJours(ligne, aujourdhui) > 0,
  );

  const publiees = enRetard.filter(estMiseEnLigne).length;

  return {
    total: enRetard.length,
    publieesApresEcheance: publiees,
    nonPubliees: enRetard.length - publiees,
  };
}

/**
 * Lines the indicators are computed on.
 *
 * Cancelled lines are removed everywhere: a line withdrawn from the calendar is
 * neither a success nor a failure, and leaving it in would drag every rate down
 * for a decision that was taken deliberately.
 */
export function lignesComparables(
  lignes: readonly LigneIndicateur[],
): LigneIndicateur[] {
  return lignes.filter((ligne) => ligne.statut !== 'ANNULE');
}

export type Compteurs = {
  total: number;
  planifiees: number;
  televersees: number;
  misesEnLigne: number;
  enRetard: number;
  annulees: number;
  /**
   * Produits déposés qui attendent leur mise en ligne.
   *
   * **Hors partition** : ce compteur recoupe les cinq autres, il ne s'additionne
   * pas avec eux. Il répond à une question qu'aucun d'eux ne pose — combien de
   * dossiers sont sur le bureau de l'encadrement — et une ligne livrée dont
   * l'échéance est passée y figure, alors que la partition la range parmi les
   * retards.
   */
  enAttenteDePublication: number;
};

/**
 * Headline counters: planned / uploaded / online / late (§10).
 *
 * Lateness is derived from the dates, **not** from the stored `EN_RETARD`
 * status. That status is written by the nightly job, so a fresh installation —
 * or a job that failed last night — would show "no delay" while deadlines have
 * visibly passed. The dates cannot lie about that.
 *
 * The five counters form a partition of the lines: each line falls into exactly
 * one, in this order, so the breakdown chart adds up to the total.
 */
export function compteurs(
  lignes: readonly LigneIndicateur[],
  aujourdhui: Date,
): Compteurs {
  const resultat: Compteurs = {
    total: 0,
    planifiees: 0,
    televersees: 0,
    misesEnLigne: 0,
    enRetard: 0,
    annulees: 0,
    enAttenteDePublication: 0,
  };

  for (const ligne of lignes) {
    if (ligne.statut === 'ANNULE') {
      resultat.annulees += 1;
      continue;
    }

    resultat.total += 1;

    // Compté avant la partition, et indépendamment d'elle : la question posée
    // est « qu'y a-t-il à mettre en ligne », pas « où en est cette ligne ». Une
    // ligne livrée en retard reste un dossier à traiter.
    if (ligne.statut === 'TELEVERSE' && !estMiseEnLigne(ligne)) {
      resultat.enAttenteDePublication += 1;
    }

    if (estMiseEnLigne(ligne)) {
      resultat.misesEnLigne += 1;
    } else if (estEchue(ligne, aujourdhui)) {
      // A file may well have been uploaded; as long as it is not online, the
      // publication is late — that is what §10 measures.
      resultat.enRetard += 1;
    } else if (ligne.statut === 'TELEVERSE') {
      resultat.televersees += 1;
    } else {
      resultat.planifiees += 1;
    }
  }

  return resultat;
}

/** Percentage of the year's lines already released — the progress bar (§9.1). */
export function avancementAnnee(lignes: readonly LigneIndicateur[]): number {
  const comparables = lignesComparables(lignes);

  if (comparables.length === 0) {
    return 0;
  }

  return Math.round(
    (comparables.filter(estMiseEnLigne).length / comparables.length) * 100,
  );
}
