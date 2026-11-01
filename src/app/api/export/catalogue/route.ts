import ExcelJS from 'exceljs';
import { appliquerPolice } from '@/lib/exports/police';

import { auth } from '@/auth';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { chargerElementsCatalogue } from '@/lib/catalogue/chargement';
import {
  type ElementCatalogue,
  libellePeriodicite,
  statistiquesCatalogue,
} from '@/lib/catalogue/statistiques';
import { genererCataloguePdf } from '@/lib/pdf/catalogue';
import { type ChartePdf, chargerChartePdf } from '@/lib/pdf/charte';

/**
 * Catalogue export — `?format=pdf` or `?format=xlsx` (default).
 *
 * The perimeter comes from the session, never from the request: a point focal
 * downloads their structure's catalogue, whatever the address says.
 */

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

function feuilleTableau(
  classeur: ExcelJS.Workbook,
  nom: string,
  charte: ChartePdf,
  titre: string,
  colonnes: { titre: string; largeur: number }[],
  lignes: (string | number)[][],
) {
  const feuille = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 4 }] });

  feuille.mergeCells(1, 1, 1, colonnes.length);
  feuille.getCell(1, 1).value = titre;
  feuille.getCell(1, 1).font = { bold: true, size: 14, color: { argb: argb(charte.primaire) } };
  feuille.mergeCells(2, 1, 2, colonnes.length);
  feuille.getCell(2, 1).value = `${charte.nom} — édité le ${formaterJJMMAAAA(new Date())}`;
  feuille.getCell(2, 1).font = { color: { argb: 'FF71717A' } };

  colonnes.forEach((colonne, index) => {
    feuille.getColumn(index + 1).width = colonne.largeur;
    const cellule = feuille.getCell(4, index + 1);
    cellule.value = colonne.titre;
    cellule.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(charte.primaire) } };
    cellule.alignment = { vertical: 'middle' };
  });
  feuille.getRow(4).height = 22;

  lignes.forEach((ligne, index) => {
    const rangee = feuille.getRow(5 + index);
    ligne.forEach((valeur, colonne) => {
      rangee.getCell(colonne + 1).value = valeur;
    });
    if (index % 2 === 1) {
      rangee.eachCell((cellule) => {
        cellule.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(charte.primaireDouce) } };
      });
    }
  });

  feuille.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: colonnes.length } };

  return feuille;
}

async function classeurCatalogue(elements: ElementCatalogue[], charte: ChartePdf) {
  const stats = statistiquesCatalogue(elements);
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';

  feuilleTableau(classeur, 'Synthèse', charte, 'Catalogue — synthèse', [
    { titre: 'Indicateur', largeur: 34 },
    { titre: 'Valeur', largeur: 16 },
  ], [
    ['Produits au catalogue', stats.total],
    ['Publications', stats.publications],
    ['Indicateurs', stats.indicateurs],
    ['Produits actifs', stats.actifs],
    ['Domaines couverts', stats.domainesCouverts],
    ['Structures', stats.structuresCouvertes],
    ['Délai moyen de diffusion (jours)', stats.delaiMoyen ?? '—'],
    ...stats.parPeriodicite.map((part) => [`Périodicité — ${part.libelle}`, part.nombre]),
    ...stats.parDomaine.map((part) => [`Domaine — ${part.libelle}`, part.nombre]),
  ]);

  feuilleTableau(classeur, 'Publications', charte, 'Publications', [
    { titre: 'Publication', largeur: 46 },
    { titre: 'Structure', largeur: 14 },
    { titre: 'Domaine', largeur: 22 },
    { titre: 'Périodicité', largeur: 16 },
    { titre: 'Délai (j)', largeur: 10 },
    { titre: 'Point focal', largeur: 26 },
    { titre: 'Actif', largeur: 8 },
  ], elements.filter((element) => element.type === 'PUBLICATION').map((element) => [
    element.nom,
    element.structure,
    element.domaine ?? '',
    libellePeriodicite(element.periodicite),
    element.delaiJours,
    element.pointFocal ?? '',
    element.actif ? 'Oui' : 'Non',
  ]));

  feuilleTableau(classeur, 'Indicateurs', charte, 'Indicateurs', [
    { titre: 'Indicateur', largeur: 42 },
    { titre: 'Unité', largeur: 12 },
    { titre: 'Publication', largeur: 34 },
    { titre: 'Structure', largeur: 14 },
    { titre: 'Périodicité', largeur: 16 },
    { titre: 'Délai (j)', largeur: 10 },
    { titre: 'Actif', largeur: 8 },
  ], elements.filter((element) => element.type === 'INDICATEUR').map((element) => [
    element.nom,
    element.unite ?? '',
    element.publication ?? '',
    element.structure,
    libellePeriodicite(element.periodicite),
    element.delaiJours,
    element.actif ? 'Oui' : 'Non',
  ]));

  appliquerPolice(classeur, { primaire: charte.primaire, secondaire: charte.secondaire, secondaireDouce: charte.secondaireDouce });

  return classeur.xlsx.writeBuffer();
}

export async function GET(requete: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return new Response('Authentification requise.', { status: 401 });
  }

  const acteur = {
    id: session.user.id,
    role: session.user.role,
    structureId: session.user.structureId,
    structuresAdmin: session.user.structuresAdmin,
    organisationId: session.user.organisationId,
  };

  const [elements, charte] = await Promise.all([
    chargerElementsCatalogue(acteur),
    chargerChartePdf(acteur.organisationId),
  ]);

  const date = new Date().toISOString().slice(0, 10);

  if (new URL(requete.url).searchParams.get('format') === 'pdf') {
    const pdf = await genererCataloguePdf(elements, charte, session.user.name ?? '');

    return new Response(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="catalogue-${date}.pdf"`,
        'cache-control': 'no-store',
      },
    });
  }

  const tampon = await classeurCatalogue(elements, charte);

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="catalogue-${date}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
}
