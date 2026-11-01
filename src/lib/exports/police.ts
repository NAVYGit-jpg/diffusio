import type ExcelJS from 'exceljs';

/** House typeface of every generated document, spreadsheets included. */
export const POLICE_DOCUMENTS = 'Montserrat';

/**
 * Sets Montserrat on every written cell, keeping size, weight and colour.
 *
 * Applied once, just before writing, rather than in each sheet builder: a
 * cell styled later in the code would otherwise slip back to Calibri.
 */
export function appliquerPolice(classeur: ExcelJS.Workbook): void {
  for (const feuille of classeur.worksheets) {
    feuille.eachRow({ includeEmpty: true }, (ligne) => {
      ligne.eachCell({ includeEmpty: true }, (cellule) => {
        cellule.font = { ...cellule.font, name: POLICE_DOCUMENTS };
      });
    });
  }
}
