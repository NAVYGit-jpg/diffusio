import type ExcelJS from 'exceljs';

import {
  assombrirJusquAuContraste,
  depuisHex,
  eclaircir,
  versHex,
} from '@/lib/apparence/palette';
import { prisma } from '@/lib/prisma';

/** House typeface of every generated document, spreadsheets included. */
export const POLICE_DOCUMENTS = 'Montserrat';

/** Grey the sheet builders use for header rows, and for secondary text. */
const GRIS_EN_TETE = 'FFE4E4E7';
const GRIS_TEXTE = 'FF71717A';

export type CouleursClasseur = { primaire: string; secondaire: string; secondaireDouce: string };

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

/** The organisation's primary and secondary colours, legible on white. */
export async function couleursClasseur(organisationId: string): Promise<CouleursClasseur> {
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { couleurPrimaire: true, couleurSecondaire: true },
  });
  const primaire = depuisHex(organisation?.couleurPrimaire ?? '#1e40af') ?? { r: 30, v: 64, b: 175 };
  const secondaire = depuisHex(organisation?.couleurSecondaire ?? '#475569') ?? { r: 71, v: 85, b: 105 };

  return {
    primaire: versHex(assombrirJusquAuContraste(primaire)),
    secondaire: versHex(assombrirJusquAuContraste(secondaire)),
    secondaireDouce: versHex(eclaircir(secondaire, 0.9)),
  };
}

/**
 * Montserrat on every written cell, and the organisation's colours on the
 * parts that carry them: header rows in the primary colour with a secondary
 * rule, titles in the primary colour, subtitles in the secondary one.
 *
 * Applied once, just before writing, rather than in each sheet builder: a
 * cell styled later in the code would otherwise slip back to Calibri and grey.
 */
export function appliquerPolice(classeur: ExcelJS.Workbook, couleurs?: CouleursClasseur): void {
  for (const feuille of classeur.worksheets) {
    feuille.eachRow({ includeEmpty: true }, (ligne) => {
      ligne.eachCell({ includeEmpty: true }, (cellule) => {
        const police = { ...cellule.font, name: POLICE_DOCUMENTS };

        if (couleurs) {
          const remplissage = cellule.fill as ExcelJS.FillPattern | undefined;

          if (remplissage?.type === 'pattern' && remplissage.fgColor?.argb === GRIS_EN_TETE) {
            cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(couleurs.primaire) } };
            cellule.border = { bottom: { style: 'medium', color: { argb: argb(couleurs.secondaire) } } };
            police.bold = true;
            police.color = { argb: 'FFFFFFFF' };
          } else if ((police.size ?? 0) >= 14) {
            police.color = { argb: argb(couleurs.primaire) };
          } else if (police.color?.argb === GRIS_TEXTE) {
            police.color = { argb: argb(couleurs.secondaire) };
          }
        }

        cellule.font = police;
      });
    });
  }
}
