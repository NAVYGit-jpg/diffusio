import type { Periodicite, TypeDelai } from '@prisma/client';

import {
  type JourFerie,
  ajouterJours,
  dernierJourDuMois,
  estJourOuvre,
  jour,
  normaliserJour,
  reporterAuJourOuvre,
} from './dates';

/**
 * Calendar generation engine (cahier des charges §5).
 *
 * The whole product rests on this file: a wrong date here becomes a wrong
 * commitment published by a national institute. It carries no database and no
 * framework dependency so that every rule can be tested in isolation.
 */

export type Periode = {
  libellePeriode: string;
  dateDebutCouverture: Date;
  dateFinCouverture: Date;
};

const MOIS_FRANCAIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/**
 * Splits a year into the periods covered by an element (§5.2).
 *
 * `PONCTUELLE` returns nothing: its single line is entered by hand.
 * `PLURIANNUELLE` returns one period covering the whole cycle ending on the
 * selected year — the year is the one picked at generation time, there is no
 * "production year" to compute (DEC-115).
 */
export function decouperPeriodes(
  periodicite: Periodicite,
  annee: number,
  nombreAnneesPeriodicite: number | null = null,
): Periode[] {
  switch (periodicite) {
    case 'MENSUELLE':
      return Array.from({ length: 12 }, (_, index) => {
        const mois = index + 1;
        return {
          libellePeriode: `${MOIS_FRANCAIS[index]} ${annee}`,
          dateDebutCouverture: jour(annee, mois, 1),
          dateFinCouverture: dernierJourDuMois(annee, mois),
        };
      });

    case 'TRIMESTRIELLE':
      return Array.from({ length: 4 }, (_, index) => {
        const premierMois = index * 3 + 1;
        return {
          libellePeriode: `T${index + 1} ${annee}`,
          dateDebutCouverture: jour(annee, premierMois, 1),
          dateFinCouverture: dernierJourDuMois(annee, premierMois + 2),
        };
      });

    case 'SEMESTRIELLE':
      return Array.from({ length: 2 }, (_, index) => {
        const premierMois = index * 6 + 1;
        return {
          libellePeriode: `S${index + 1} ${annee}`,
          dateDebutCouverture: jour(annee, premierMois, 1),
          dateFinCouverture: dernierJourDuMois(annee, premierMois + 5),
        };
      });

    case 'ANNUELLE':
      return [
        {
          libellePeriode: String(annee),
          dateDebutCouverture: jour(annee, 1, 1),
          dateFinCouverture: jour(annee, 12, 31),
        },
      ];

    case 'PLURIANNUELLE': {
      if (nombreAnneesPeriodicite === null || nombreAnneesPeriodicite < 2) {
        return [];
      }

      const anneeDebut = annee - nombreAnneesPeriodicite + 1;

      return [
        {
          libellePeriode: `${anneeDebut}-${annee}`,
          dateDebutCouverture: jour(anneeDebut, 1, 1),
          dateFinCouverture: jour(annee, 12, 31),
        },
      ];
    }

    case 'PONCTUELLE':
      return [];

    default:
      return [];
  }
}

/**
 * Adds a lead time to the end of a coverage period (§5.3).
 *
 * `CALENDAIRES` is a plain addition of days. `OUVRES` advances one working day
 * at a time, skipping weekends and public holidays — so a 10-working-day lead
 * time really means ten days of work, not ten days on the wall calendar.
 *
 * `reportSiWeekendOuFerie` applies afterwards, and only matters for calendar
 * days: a working-day computation already lands on a working day.
 */
export function ajouterDelai(
  dateFinCouverture: Date,
  delaiJours: number,
  delaiType: TypeDelai,
  options: {
    joursFeries?: readonly JourFerie[];
    reportSiWeekendOuFerie?: boolean;
  } = {},
): Date {
  const feries = options.joursFeries ?? [];
  const depart = normaliserJour(dateFinCouverture);

  let resultat: Date;

  if (delaiType === 'OUVRES') {
    resultat = depart;
    let restants = delaiJours;

    // Guard against a holiday table so dense that no working day is left.
    let gardeFou = 0;

    while (restants > 0 && gardeFou < 100_000) {
      resultat = ajouterJours(resultat, 1);
      gardeFou += 1;

      if (estJourOuvre(resultat, feries)) {
        restants -= 1;
      }
    }
  } else {
    resultat = ajouterJours(depart, delaiJours);
  }

  if (options.reportSiWeekendOuFerie) {
    resultat = reporterAuJourOuvre(resultat, feries);
  }

  return resultat;
}

export type ElementPlanifiable = {
  periodicite: Periodicite;
  nombreAnneesPeriodicite: number | null;
  delaiJours: number;
  delaiType: TypeDelai;
  reportSiWeekendOuFerie: boolean;
};

export type LigneGeneree = Periode & {
  dateDiffusionPrevue: Date;
};

/**
 * Full generation for one element and one year: periods, then the announced
 * release date for each of them.
 */
export function genererLignes(
  element: ElementPlanifiable,
  annee: number,
  joursFeries: readonly JourFerie[] = [],
): LigneGeneree[] {
  return decouperPeriodes(
    element.periodicite,
    annee,
    element.nombreAnneesPeriodicite,
  ).map((periode) => ({
    ...periode,
    dateDiffusionPrevue: ajouterDelai(
      periode.dateFinCouverture,
      element.delaiJours,
      element.delaiType,
      {
        joursFeries,
        reportSiWeekendOuFerie: element.reportSiWeekendOuFerie,
      },
    ),
  }));
}

/**
 * Number of lines an element will produce, shown before generating (§5.4).
 *
 * Deliberately derived from `decouperPeriodes` rather than reimplemented: two
 * independent counts would eventually disagree, and the preview would lie.
 */
export function nombreDeLignes(
  periodicite: Periodicite,
  nombreAnneesPeriodicite: number | null,
  annee: number,
): number {
  return decouperPeriodes(periodicite, annee, nombreAnneesPeriodicite).length;
}
