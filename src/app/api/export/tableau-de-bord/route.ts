import ExcelJS from 'exceljs';

import { auth } from '@/auth';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { LIBELLE_STATUT_PLURIEL } from '@/lib/calendrier/statuts';
import { prisma } from '@/lib/prisma';
import { lireFiltres } from '@/lib/tableau-bord/filtres-url';
import { nomFichierPeriode } from '@/lib/tableau-bord/periode';
import {
  type Rapport,
  assemblerRapport,
  indicateursDuRapport,
} from '@/lib/tableau-bord/rapport';
import type { Part } from '@/lib/tableau-bord/indicateurs';

/**
 * Dashboard export to Excel (cahier des charges §10).
 *
 *   /api/export/tableau-de-bord?annee=2026&type=PUBLICATION&domaine=…
 *
 * Takes the same query string as the screen, so the file always reproduces the
 * view the user was looking at. The perimeter is recomputed from the session,
 * never read from the request.
 *
 * ExcelJS cannot write native charts, so the graphs travel as their underlying
 * tables — with in-cell data bars to keep the shape readable. Anyone wanting a
 * real chart selects the table and inserts one; anyone wanting the drawings
 * takes the PDF instead.
 */

const GRIS = 'FFE4E4E7';
const GRIS_TEXTE = 'FF71717A';

function enTeteFeuille(
  feuille: ExcelJS.Worksheet,
  titre: string,
  rapport: Rapport,
  organisation: string,
): number {
  feuille.mergeCells('A1:D1');
  feuille.getCell('A1').value = titre;
  feuille.getCell('A1').font = { bold: true, size: 14 };

  feuille.mergeCells('A2:D2');
  feuille.getCell('A2').value = `${organisation} — ${rapport.perimetre}`;
  feuille.getCell('A2').font = { color: { argb: GRIS_TEXTE } };

  // The period, not just the year: a sheet filtered on January that announces
  // "Calendrier 2026" is a file nobody can check a month later.
  feuille.mergeCells('A3:D3');
  feuille.getCell('A3').value = `${rapport.periode} — édité le ${formaterJJMMAAAA(
    rapport.genereLe,
  )}`;
  feuille.getCell('A3').font = { color: { argb: GRIS_TEXTE } };

  let ligne = 4;

  for (const filtre of rapport.filtresLisibles) {
    feuille.mergeCells(`A${ligne}:D${ligne}`);
    feuille.getCell(`A${ligne}`).value = filtre;
    feuille.getCell(`A${ligne}`).font = {
      italic: true,
      color: { argb: GRIS_TEXTE },
    };
    ligne += 1;
  }

  return ligne + 1;
}

function ecrireEnTeteColonnes(
  feuille: ExcelJS.Worksheet,
  numeroLigne: number,
  intitules: string[],
): void {
  const ligne = feuille.getRow(numeroLigne);

  intitules.forEach((intitule, index) => {
    const cellule = ligne.getCell(index + 1);
    cellule.value = intitule;
    cellule.font = { bold: true };
    cellule.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: GRIS },
    };
  });
}

/**
 * A breakdown table with an in-cell bar.
 *
 * The data bar is the closest thing to a chart Excel offers without a drawing:
 * it survives sorting and copy-paste, which a picture would not.
 */
function ecrireRepartition(
  feuille: ExcelJS.Worksheet,
  depart: number,
  titre: string,
  parts: readonly Part[],
): number {
  feuille.getCell(`A${depart}`).value = titre;
  feuille.getCell(`A${depart}`).font = { bold: true };

  ecrireEnTeteColonnes(feuille, depart + 1, ['Libellé', 'Effectif', 'Part']);

  const total = parts.reduce((somme, part) => somme + part.nombre, 0);

  parts.forEach((part, index) => {
    const ligne = feuille.getRow(depart + 2 + index);
    ligne.getCell(1).value = part.libelle;
    ligne.getCell(2).value = part.nombre;
    ligne.getCell(3).value = total === 0 ? 0 : part.nombre / total;
    ligne.getCell(3).numFmt = '0.0 %';
  });

  if (parts.length > 0) {
    feuille.addConditionalFormatting({
      ref: `B${depart + 2}:B${depart + 1 + parts.length}`,
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          gradient: false,
          // Excel refuses a data bar without its two reference points.
          cfvo: [{ type: 'min' }, { type: 'max' }],
        },
      ],
    });
  }

  return depart + parts.length + 3;
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

  const parametres = Object.fromEntries(
    [...new URL(requete.url).searchParams].reduce((carte, [cle, valeur]) => {
      const existant = carte.get(cle);
      carte.set(cle, existant ? [...existant, valeur] : [valeur]);

      return carte;
    }, new Map<string, string[]>()),
  );

  const filtres = lireFiltres(parametres);
  const rapport = await assemblerRapport(acteur, filtres);

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: acteur.organisationId },
    select: { nom: true },
  });

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';
  classeur.created = rapport.genereLe;

  // ------------------------------------------------------------- synthèse
  const synthese = classeur.addWorksheet('Synthèse');
  synthese.getColumn(1).width = 34;
  synthese.getColumn(2).width = 16;
  synthese.getColumn(3).width = 52;

  let ligne = enTeteFeuille(
    synthese,
    'Tableau de bord de la diffusion',
    rapport,
    organisation.nom,
  );

  ecrireEnTeteColonnes(synthese, ligne, ['Indicateur', 'Valeur', 'Précision']);
  ligne += 1;

  for (const indicateur of indicateursDuRapport(rapport)) {
    const courante = synthese.getRow(ligne);
    courante.getCell(1).value = indicateur.libelle;
    courante.getCell(2).value = indicateur.valeur;
    courante.getCell(2).alignment = { horizontal: 'right' };
    courante.getCell(3).value = indicateur.precision;
    ligne += 1;
  }

  ligne += 1;
  synthese.getCell(`A${ligne}`).value = 'Lecture des résultats';
  synthese.getCell(`A${ligne}`).font = { bold: true };
  ligne += 1;

  for (const observation of rapport.commentaire) {
    synthese.mergeCells(`A${ligne}:C${ligne}`);
    const cellule = synthese.getCell(`A${ligne}`);
    cellule.value = observation.texte;
    cellule.alignment = { wrapText: true, vertical: 'top' };

    if (observation.ton === 'alerte') {
      cellule.font = { color: { argb: 'FFB91C1C' } };
    } else if (observation.ton === 'positif') {
      cellule.font = { color: { argb: 'FF15803D' } };
    }

    synthese.getRow(ligne).height = 30;
    ligne += 1;
  }

  // --------------------------------------------------- évolution mensuelle
  const evolution = classeur.addWorksheet('Évolution mensuelle');
  evolution.getColumn(1).width = 14;
  evolution.getColumn(2).width = 20;
  evolution.getColumn(3).width = 22;

  let ligneEvolution = enTeteFeuille(
    evolution,
    'Évolution mensuelle du taux de respect',
    rapport,
    organisation.nom,
  );

  ecrireEnTeteColonnes(evolution, ligneEvolution, [
    'Mois',
    'Lignes jugeables',
    'Taux de respect',
  ]);
  ligneEvolution += 1;

  for (const point of rapport.courbe) {
    const courante = evolution.getRow(ligneEvolution);
    courante.getCell(1).value = point.libelle;
    courante.getCell(2).value = point.base;
    // A month with nothing due carries no rate: an empty cell, not a zero,
    // which would draw a collapse where there was nothing to publish.
    if (point.taux !== null) {
      courante.getCell(3).value = point.taux / 100;
      courante.getCell(3).numFmt = '0.0 %';
    } else {
      courante.getCell(3).value = '—';
      courante.getCell(3).alignment = { horizontal: 'right' };
    }
    ligneEvolution += 1;
  }

  // ------------------------------------------------------------ répartitions
  const repartitions = classeur.addWorksheet('Répartitions');
  repartitions.getColumn(1).width = 40;
  repartitions.getColumn(2).width = 12;
  repartitions.getColumn(3).width = 10;

  let ligneRepartition = enTeteFeuille(
    repartitions,
    'Répartition des lignes du calendrier',
    rapport,
    organisation.nom,
  );

  ligneRepartition = ecrireRepartition(
    repartitions,
    ligneRepartition,
    'Par statut',
    [
      {
        libelle: LIBELLE_STATUT_PLURIEL.PLANIFIE,
        nombre: rapport.nombres.planifiees,
      },
      {
        libelle: LIBELLE_STATUT_PLURIEL.TELEVERSE,
        nombre: rapport.nombres.televersees,
      },
      {
        libelle: LIBELLE_STATUT_PLURIEL.MIS_EN_LIGNE,
        nombre: rapport.nombres.misesEnLigne,
      },
      {
        libelle: LIBELLE_STATUT_PLURIEL.EN_RETARD,
        nombre: rapport.nombres.enRetard,
      },
      {
        libelle: LIBELLE_STATUT_PLURIEL.ANNULE,
        nombre: rapport.nombres.annulees,
      },
    ].filter((part) => part.nombre > 0),
  );

  ligneRepartition = ecrireRepartition(
    repartitions,
    ligneRepartition,
    'Par type de produit',
    rapport.parType,
  );

  ligneRepartition = ecrireRepartition(
    repartitions,
    ligneRepartition,
    'Par domaine',
    rapport.parDomaine,
  );

  ligneRepartition = ecrireRepartition(
    repartitions,
    ligneRepartition,
    'Par périodicité',
    rapport.parPeriodicite,
  );

  if (rapport.parStructure.length > 1) {
    ecrireRepartition(
      repartitions,
      ligneRepartition,
      'Par structure',
      rapport.parStructure,
    );
  }

  // -------------------------------------------------------------- classement
  if (rapport.contexte.classementVisible && rapport.classement.length > 1) {
    const classement = classeur.addWorksheet('Classement');
    classement.getColumn(1).width = 6;
    classement.getColumn(2).width = 40;
    classement.getColumn(3).width = 14;
    classement.getColumn(4).width = 14;
    classement.getColumn(5).width = 12;
    classement.getColumn(6).width = 14;

    let ligneClassement = enTeteFeuille(
      classement,
      'Classement des structures',
      rapport,
      organisation.nom,
    );

    ecrireEnTeteColonnes(classement, ligneClassement, [
      'Rang',
      'Structure',
      'Jugeables',
      'Respectées',
      'En retard',
      'Taux',
    ]);
    ligneClassement += 1;

    rapport.classement.forEach((rang, index) => {
      const courante = classement.getRow(ligneClassement);
      courante.getCell(1).value = rang.taux === null ? '—' : index + 1;
      courante.getCell(2).value = rang.structureNom;
      courante.getCell(3).value = rang.base;
      courante.getCell(4).value = rang.respectees;
      courante.getCell(5).value = rang.retards;

      if (rang.taux === null) {
        courante.getCell(6).value = 'Non mesurable';
      } else {
        courante.getCell(6).value = rang.taux / 100;
        courante.getCell(6).numFmt = '0.0 %';
      }

      ligneClassement += 1;
    });
  }

  const tampon = await classeur.xlsx.writeBuffer();

  const nomFichier = `tableau-de-bord-${nomFichierPeriode(
    filtres.annee,
    filtres.mois,
  )}.xlsx`;

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nomFichier}"`,
      'cache-control': 'no-store',
    },
  });
}
