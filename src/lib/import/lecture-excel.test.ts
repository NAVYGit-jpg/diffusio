import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { aplatirCellule, lireGrilleExcel } from './lecture-excel';
import { analyserImportStructures } from './structures';

/** Builds a real .xlsx in memory, so the test exercises the actual parser. */
async function classeur(
  lignes: (string | number | null)[][],
): Promise<ArrayBuffer> {
  const document = new ExcelJS.Workbook();
  const feuille = document.addWorksheet('Structures');
  for (const ligne of lignes) {
    feuille.addRow(ligne);
  }
  return (await document.xlsx.writeBuffer()) as ArrayBuffer;
}

describe('aplatirCellule', () => {
  it('laisse passer les valeurs simples', () => {
    expect(aplatirCellule('DIRA')).toBe('DIRA');
    expect(aplatirCellule(42)).toBe(42);
  });

  it('rend une chaine vide pour une cellule absente', () => {
    expect(aplatirCellule(null)).toBe('');
    expect(aplatirCellule(undefined)).toBe('');
  });

  it('prend le resultat calcule d une formule', () => {
    // Un code saisi via une formule doit s'importer comme un code normal.
    expect(aplatirCellule({ formula: 'A1&"X"', result: 'DIRAX' })).toBe('DIRAX');
  });

  it('recompose un texte enrichi en une seule chaine', () => {
    expect(
      aplatirCellule({ richText: [{ text: 'Direction ' }, { text: 'A' }] }),
    ).toBe('Direction A');
  });

  it('prend le libelle d un lien hypertexte, pas son URL', () => {
    expect(
      aplatirCellule({ text: 'DIRA', hyperlink: 'https://exemple.org' }),
    ).toBe('DIRA');
  });

  it('neutralise une cellule en erreur au lieu de propager #REF', () => {
    expect(aplatirCellule({ error: '#REF!' })).toBe('');
  });
});

describe('lireGrilleExcel', () => {
  it('lit un classeur reel en conservant l ordre des colonnes', async () => {
    const grille = await lireGrilleExcel(
      await classeur([
        ['Nom', 'Sigle', 'Code'],
        ['Direction A', 'DIRA', 'DIRA'],
      ]),
    );

    expect(grille).toEqual([
      ['Nom', 'Sigle', 'Code'],
      ['Direction A', 'DIRA', 'DIRA'],
    ]);
  });

  it('conserve les accents', async () => {
    const grille = await lireGrilleExcel(
      await classeur([
        ['Nom', 'Sigle', 'Code'],
        ['Direction des Enquêtes Ménages', 'DEM', 'DEM'],
      ]),
    );

    expect(grille[1][0]).toBe('Direction des Enquêtes Ménages');
  });

  it('rend une grille vide pour un classeur sans feuille exploitable', async () => {
    const document = new ExcelJS.Workbook();
    document.addWorksheet('Vide');
    const grille = await lireGrilleExcel(
      (await document.xlsx.writeBuffer()) as ArrayBuffer,
    );

    expect(grille).toEqual([]);
  });
});

describe('chaine complete : fichier Excel vers rapport', () => {
  it('analyse un fichier realiste, colonnes en desordre', async () => {
    const grille = await lireGrilleExcel(
      await classeur([
        ['Code', 'Nom', 'Sigle', 'Type', 'Code parent'],
        ['MPD', 'Ministère du Plan', 'MPD', 'Ministère', ''],
        ['DSD', 'Direction des Statistiques Démographiques', 'DSD', 'Direction', 'MPD'],
        [null, null, null, null, null],
        ['SEM', 'Service des Enquêtes Ménages', 'SEM', 'Service', 'DSD'],
      ]),
    );

    const rapport = analyserImportStructures(grille, []);

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer).toHaveLength(3);
    expect(rapport.aCreer.map((s) => s.code)).toEqual(['MPD', 'DSD', 'SEM']);
  });

  it('remonte les erreurs avec le bon numero de ligne Excel', async () => {
    const grille = await lireGrilleExcel(
      await classeur([
        ['Nom', 'Sigle', 'Code', 'Type', 'Code parent'],
        ['Ministère du Plan', 'MPD', 'MPD', 'Ministère', ''],
        ['Direction fautive', 'DIRF', 'DIRF', 'Département', ''],
      ]),
    );

    const rapport = analyserImportStructures(grille, []);

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0].ligne).toBe(3);
    expect(rapport.erreurs[0].colonne).toBe('Type');
  });
});
