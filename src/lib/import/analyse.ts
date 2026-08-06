/**
 * Spreadsheet import analysis (cahier des charges §9.3, "import Excel en masse").
 *
 * Reading the file is one problem, understanding it is another. This module
 * handles the second, without any dependency on ExcelJS: it takes a raw grid of
 * cells and produces validated records plus a per-line error report. That keeps
 * the tricky part — matching column headers written by hand, in French, with
 * accents, in any order — fully testable.
 */

export type ColonneAttendue = {
  /** Key used in the produced record. */
  cle: string;
  /** Header labels accepted for this column, first one being the canonical. */
  entetes: string[];
  obligatoire: boolean;
};

export type ErreurLigne = {
  /** 1-based row number as displayed by the spreadsheet software. */
  ligne: number;
  colonne?: string;
  message: string;
};

export type ResultatAnalyse<T> = {
  valides: T[];
  erreurs: ErreurLigne[];
  /** Mandatory headers that could not be found at all. */
  colonnesManquantes: string[];
  /** Rows that were entirely empty and simply skipped. */
  lignesIgnorees: number;
};

/**
 * Normalises a header for comparison: no accents, no case, no double spaces.
 *
 * Users type "Sigle", "SIGLE", "sigle " or "Sigle*" — all of these must match.
 */
export function normaliserEntete(valeur: unknown): string {
  return String(valeur ?? '')
    .normalize('NFD')
    // Combining diacritics, written as escapes so the file's own encoding
    // cannot change the meaning of this regex.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[*:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when every cell of the row is empty or blank. */
export function ligneVide(cellules: readonly unknown[]): boolean {
  return cellules.every(
    (cellule) => cellule === null || cellule === undefined || String(cellule).trim() === '',
  );
}

/**
 * Maps each expected column to its index in the header row.
 *
 * A column absent from the file simply has no index; whether that is a problem
 * is decided by `obligatoire`.
 */
export function associerColonnes(
  entetes: readonly unknown[],
  colonnes: readonly ColonneAttendue[],
): { indices: Record<string, number>; manquantes: string[] } {
  const normalisees = entetes.map(normaliserEntete);
  const indices: Record<string, number> = {};
  const manquantes: string[] = [];

  for (const colonne of colonnes) {
    const index = normalisees.findIndex((entete) =>
      colonne.entetes.some((accepte) => normaliserEntete(accepte) === entete),
    );

    if (index >= 0) {
      indices[colonne.cle] = index;
    } else if (colonne.obligatoire) {
      manquantes.push(colonne.entetes[0]);
    }
  }

  return { indices, manquantes };
}

/**
 * Turns a grid into validated records.
 *
 * `valider` receives the raw values of one row and returns either the record or
 * a list of problems. Every row is processed: the point of an import report is
 * to show all the mistakes at once, not to stop at the first one.
 *
 * @param grille first row is the header, the rest are data
 * @param premiereLigneDonnees spreadsheet row number of the first data row,
 *        used so error messages point at the line the user actually sees
 */
export function analyserGrille<T>(
  grille: readonly (readonly unknown[])[],
  colonnes: readonly ColonneAttendue[],
  valider: (
    valeurs: Record<string, string>,
    ligne: number,
  ) => { ok: true; valeur: T } | { ok: false; erreurs: Omit<ErreurLigne, 'ligne'>[] },
  premiereLigneDonnees = 2,
): ResultatAnalyse<T> {
  if (grille.length === 0) {
    return {
      valides: [],
      erreurs: [],
      colonnesManquantes: colonnes.filter((c) => c.obligatoire).map((c) => c.entetes[0]),
      lignesIgnorees: 0,
    };
  }

  const [entetes, ...lignes] = grille;
  const { indices, manquantes } = associerColonnes(entetes, colonnes);

  if (manquantes.length > 0) {
    return {
      valides: [],
      erreurs: [],
      colonnesManquantes: manquantes,
      lignesIgnorees: 0,
    };
  }

  const valides: T[] = [];
  const erreurs: ErreurLigne[] = [];
  let lignesIgnorees = 0;

  lignes.forEach((cellules, decalage) => {
    const numeroLigne = premiereLigneDonnees + decalage;

    if (ligneVide(cellules)) {
      lignesIgnorees += 1;
      return;
    }

    const valeurs: Record<string, string> = {};

    for (const colonne of colonnes) {
      const index = indices[colonne.cle];
      valeurs[colonne.cle] =
        index === undefined ? '' : String(cellules[index] ?? '').trim();
    }

    const resultat = valider(valeurs, numeroLigne);

    if (resultat.ok) {
      valides.push(resultat.valeur);
    } else {
      for (const erreur of resultat.erreurs) {
        erreurs.push({ ...erreur, ligne: numeroLigne });
      }
    }
  });

  return { valides, erreurs, colonnesManquantes: [], lignesIgnorees };
}

/**
 * Flags values duplicated inside the file itself.
 *
 * A unique constraint in the database would catch these too, but only one at a
 * time and with an unreadable message. Better to report them all up front.
 */
export function detecterDoublons<T>(
  elements: readonly T[],
  cle: (element: T) => string,
  ligneDe: (element: T) => number,
  libelleColonne: string,
): ErreurLigne[] {
  const vues = new Map<string, number>();
  const erreurs: ErreurLigne[] = [];

  for (const element of elements) {
    const valeur = cle(element).toLowerCase();

    if (valeur === '') {
      continue;
    }

    const premiere = vues.get(valeur);

    if (premiere !== undefined) {
      erreurs.push({
        ligne: ligneDe(element),
        colonne: libelleColonne,
        message: `Doublon dans le fichier : « ${cle(element)} » figure déjà à la ligne ${premiere}.`,
      });
    } else {
      vues.set(valeur, ligneDe(element));
    }
  }

  return erreurs;
}
