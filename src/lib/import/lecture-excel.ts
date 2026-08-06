import ExcelJS from 'exceljs';

/**
 * Turns a spreadsheet into a plain grid of values.
 *
 * Kept out of the server action so it can be tested against real .xlsx buffers.
 *
 * Two ExcelJS quirks are handled here:
 *   - `row.values` is 1-based and carries an empty leading slot;
 *   - a cell is not always a scalar. Formulas, hyperlinks and rich text arrive
 *     as objects, and a code typed as a formula must still import correctly.
 */
export function aplatirCellule(cellule: unknown): unknown {
  if (cellule === null || cellule === undefined) {
    return '';
  }

  if (cellule instanceof Date) {
    return cellule.toISOString();
  }

  if (typeof cellule !== 'object') {
    return cellule;
  }

  const objet = cellule as Record<string, unknown>;

  if ('richText' in objet && Array.isArray(objet.richText)) {
    return objet.richText
      .map((morceau) => String((morceau as { text?: string }).text ?? ''))
      .join('');
  }

  // A formula cell exposes both; the computed result is what the user sees.
  if ('result' in objet && objet.result !== undefined && objet.result !== null) {
    return aplatirCellule(objet.result);
  }

  if ('text' in objet) {
    return objet.text;
  }

  if ('hyperlink' in objet && 'text' in objet) {
    return objet.text;
  }

  if ('error' in objet) {
    return '';
  }

  return '';
}

export async function lireGrilleExcel(
  contenu: ArrayBuffer,
): Promise<unknown[][]> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.load(contenu);

  const feuille = classeur.worksheets[0];

  if (!feuille) {
    return [];
  }

  const grille: unknown[][] = [];

  feuille.eachRow({ includeEmpty: false }, (ligne) => {
    const valeurs = Array.isArray(ligne.values) ? ligne.values.slice(1) : [];
    grille.push(valeurs.map(aplatirCellule));
  });

  return grille;
}
