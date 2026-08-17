import { LIBELLE_MOIS } from './filtres-url';

/**
 * Saying in French which period a report covers (cahier des charges §10).
 *
 * The cover page of the PDF, the header of every Excel sheet and the file name
 * all name the same period, so they all come through here. A report whose cover
 * says "2026" while its figures cover January is worse than one with no cover
 * at all: it is wrong in a way the reader cannot see.
 */

/** Months whose name takes « d' » rather than « de ». */
function commenceParUneVoyelle(mois: number): boolean {
  return /^[aeiouyéèêh]/i.test(LIBELLE_MOIS[mois] ?? '');
}

/** True when the months follow one another without a gap. */
function sontConsecutifs(mois: readonly number[]): boolean {
  return mois.every(
    (valeur, index) => index === 0 || valeur === mois[index - 1] + 1,
  );
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/**
 * The coverage period, spelled out.
 *
 *   []          → « Année 2026 »
 *   [1]         → « Janvier 2026 »
 *   [1,2,3]     → « De janvier à mars 2026 »
 *   [4,5,6,7]   → « D'avril à juillet 2026 »
 *   [1,3,6]     → « Janvier, mars et juin 2026 »
 *
 * A run of consecutive months is written as a range rather than a list: three
 * months is already a mouthful, and a quarter is the commonest case of all.
 * Twelve months is the whole year again, whatever the boxes say.
 */
export function libellePeriode(annee: number, mois: readonly number[]): string {
  const tries = [...new Set(mois)]
    .filter((valeur) => Number.isInteger(valeur) && valeur >= 1 && valeur <= 12)
    .sort((a, b) => a - b);

  if (tries.length === 0 || tries.length === 12) {
    return `Année ${annee}`;
  }

  if (tries.length === 1) {
    return `${LIBELLE_MOIS[tries[0]]} ${annee}`;
  }

  const premier = tries[0];
  const dernier = tries[tries.length - 1];

  if (sontConsecutifs(tries)) {
    const article = commenceParUneVoyelle(premier) ? "D'" : 'De ';

    return `${article}${LIBELLE_MOIS[premier].toLowerCase()} à ${LIBELLE_MOIS[
      dernier
    ].toLowerCase()} ${annee}`;
  }

  const noms = tries.map((valeur) => LIBELLE_MOIS[valeur].toLowerCase());
  const debut = noms.slice(0, -1).join(', ');

  return `${majuscule(debut)} et ${noms[noms.length - 1]} ${annee}`;
}

/**
 * The same period, as a file name fragment.
 *
 *   []        → « 2026 »
 *   [1]       → « 2026-01 »
 *   [1,2,3]   → « 2026-01-a-03 »
 *   [1,3,6]   → « 2026-01-03-06 »
 *
 * Numbers rather than names, zero-padded: a folder holding a year of reports
 * then sorts itself chronologically, which « fevrier » before « janvier » would
 * not. ASCII only — accents in a file name survive neither every mail gateway
 * nor every shared drive.
 */
export function nomFichierPeriode(
  annee: number,
  mois: readonly number[],
): string {
  const tries = [...new Set(mois)]
    .filter((valeur) => Number.isInteger(valeur) && valeur >= 1 && valeur <= 12)
    .sort((a, b) => a - b);

  if (tries.length === 0 || tries.length === 12) {
    return String(annee);
  }

  const deuxChiffres = (valeur: number) => String(valeur).padStart(2, '0');

  if (tries.length === 1) {
    return `${annee}-${deuxChiffres(tries[0])}`;
  }

  if (sontConsecutifs(tries)) {
    return `${annee}-${deuxChiffres(tries[0])}-a-${deuxChiffres(
      tries[tries.length - 1],
    )}`;
  }

  return `${annee}-${tries.map(deuxChiffres).join('-')}`;
}
