import ExcelJS from 'exceljs';

import { auth } from '@/auth';
import { canAccessStructure, perimetreStructures } from '@/lib/auth/permissions';
import {
  COLONNES_EXPORT,
  type LigneSource,
  construireLignesExport,
  libellePerimetre,
  nomFichierExport,
  trierLignesExport,
} from '@/lib/exports/calendrier-excel';
import { prisma } from '@/lib/prisma';

/**
 * Calendar export to Excel (cahier des charges §9.3 and §10).
 *
 *   /api/export/calendrier?annee=2026&structure=<id>   one structure
 *   /api/export/calendrier?annee=2026&global=1         every structure in scope
 *
 * The scope is never taken from the request: it is recomputed from the session.
 * A point focal exports their own structure, an administrator the structures
 * assigned to them, a super admin everything — and asking for somebody else's
 * identifier changes nothing.
 */
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
  };

  const parametres = new URL(requete.url).searchParams;
  const annee = Number(parametres.get('annee'));
  const structureDemandee = parametres.get('structure');
  const global = parametres.get('global') === '1';

  if (!Number.isInteger(annee) || annee < 2000 || annee > 2200) {
    return new Response('Année invalide.', { status: 400 });
  }

  // `null` means no restriction; an empty array means nothing is visible.
  // Confusing the two would either leak every structure or hide them all.
  const perimetre = perimetreStructures(acteur);

  if (perimetre !== null && perimetre.length === 0) {
    return new Response(
      "Aucune structure ne vous est rattachée : il n'y a rien à exporter.",
      { status: 403 },
    );
  }

  let filtreStructures: { in: string[] } | undefined;
  let structureUnique: { nom: string; sigle: string } | null = null;

  if (!global && structureDemandee) {
    if (!canAccessStructure(acteur, structureDemandee)) {
      return new Response(
        "Cette structure n'est pas dans votre périmètre.",
        { status: 403 },
      );
    }

    structureUnique = await prisma.structure.findFirst({
      where: {
        id: structureDemandee,
        organisationId: session.user.organisationId,
        deletedAt: null,
      },
      select: { nom: true, sigle: true },
    });

    if (!structureUnique) {
      return new Response("Cette structure n'existe plus.", { status: 404 });
    }

    filtreStructures = { in: [structureDemandee] };
  } else if (perimetre !== null) {
    filtreStructures = { in: perimetre };
  }

  const lignes = await prisma.ligneCalendrier.findMany({
    where: {
      calendrier: {
        organisationId: session.user.organisationId,
        annee,
        ...(filtreStructures ? { structureId: filtreStructures } : {}),
      },
    },
    include: {
      calendrier: {
        select: { structure: { select: { nom: true, sigle: true } } },
      },
      publication: {
        select: {
          nom: true,
          periodicite: true,
          domaine: { select: { nom: true } },
          pointFocal: { select: { nom: true, prenoms: true } },
        },
      },
      indicateur: {
        select: {
          nom: true,
          periodicite: true,
          domaine: { select: { nom: true } },
          pointFocal: { select: { nom: true, prenoms: true } },
        },
      },
    },
  });

  const sources: LigneSource[] = lignes.map((ligne) => {
    const element = ligne.publication ?? ligne.indicateur;

    return {
      structureNom: ligne.calendrier.structure.nom,
      structureSigle: ligne.calendrier.structure.sigle,
      elementType: ligne.elementType,
      nomElement: element?.nom ?? 'Élément supprimé',
      domaine: element?.domaine?.nom ?? null,
      periodicite: element?.periodicite ?? '',
      libellePeriode: ligne.libellePeriode,
      dateDebutCouverture: ligne.dateDebutCouverture,
      dateFinCouverture: ligne.dateFinCouverture,
      dateDiffusionPrevue: ligne.dateDiffusionPrevue,
      dateDiffusionReelle: ligne.dateDiffusionReelle,
      statut: ligne.statut,
      pointFocal: element?.pointFocal
        ? `${element.pointFocal.prenoms} ${element.pointFocal.nom}`
        : null,
      lienPublication: ligne.lienPublication,
    };
  });

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: session.user.organisationId },
    select: { nom: true, sigle: true },
  });

  const triees = trierLignesExport(sources);
  const structuresPresentes = new Set(triees.map((l) => l.structureNom));

  // ---------------------------------------------------------------- classeur
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'DIFFUSIO';
  classeur.created = new Date();

  const feuille = classeur.addWorksheet(`Calendrier ${annee}`, {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  feuille.mergeCells('A1:E1');
  feuille.getCell('A1').value = `Calendrier de diffusion ${annee}`;
  feuille.getCell('A1').font = { bold: true, size: 14 };

  feuille.mergeCells('A2:E2');
  feuille.getCell('A2').value = organisation.nom;
  feuille.getCell('A2').font = { color: { argb: 'FF71717A' } };

  feuille.mergeCells('A3:E3');
  feuille.getCell('A3').value = libellePerimetre({
    global,
    nombreStructures: structuresPresentes.size,
    nomStructure: structureUnique?.nom,
  });
  feuille.getCell('A3').font = { color: { argb: 'FF71717A' } };

  const enTete = feuille.getRow(4);
  COLONNES_EXPORT.forEach((colonne, index) => {
    const cellule = enTete.getCell(index + 1);
    cellule.value = colonne.entete;
    cellule.font = { bold: true };
    cellule.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE4E4E7' },
    };
    feuille.getColumn(index + 1).width = colonne.largeur;
  });

  for (const ligne of construireLignesExport(triees)) {
    feuille.addRow(COLONNES_EXPORT.map((colonne) => ligne[colonne.cle]));
  }

  // Filters on the header row: the file is meant to be worked with, not just
  // read — sorting by structure or by status must not require any setup.
  if (triees.length > 0) {
    feuille.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: COLONNES_EXPORT.length },
    };
  } else {
    feuille.getRow(5).getCell(1).value =
      'Aucune ligne de calendrier pour cette année et ce périmètre.';
  }

  const tampon = await classeur.xlsx.writeBuffer();

  return new Response(tampon as ArrayBuffer, {
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nomFichierExport({
        annee,
        global,
        sigleStructure: structureUnique?.sigle,
      })}"`,
      'cache-control': 'no-store',
    },
  });
}
