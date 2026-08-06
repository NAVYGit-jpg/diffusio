'use server';

import { revalidatePath } from 'next/cache';

import { assertPermission, PermissionRefusee } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { lireGrilleExcel } from '@/lib/import/lecture-excel';
import {
  type RapportImportStructures,
  analyserImportStructures,
  ordonnerPourCreation,
} from '@/lib/import/structures';
import { prisma } from '@/lib/prisma';

export type EtatImport = {
  rapport?: RapportImportStructures;
  /** Rows caught in a parent cycle spanning the file itself. */
  cycliques?: { ligne: number; code: string }[];
  applique?: boolean;
  nombreCrees?: number;
  erreur?: string;
};

/** Files larger than this are refused before being parsed. */
const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

/**
 * Analyses an uploaded file and, when `confirmer` is set, applies it.
 *
 * The two-step flow is deliberate: §5.5 asks for a difference report before
 * anything is written, and the same expectation applies to a bulk import.
 */
export async function importerStructuresAction(
  _etatPrecedent: EtatImport,
  donnees: FormData,
): Promise<EtatImport> {
  const acteur = await exigerActeur();

  try {
    assertPermission(acteur, 'structure:gerer');
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const fichier = donnees.get('fichier');

  if (!(fichier instanceof File) || fichier.size === 0) {
    return { erreur: 'Choisissez un fichier Excel à importer.' };
  }

  if (fichier.size > TAILLE_MAX_OCTETS) {
    return {
      erreur: `Le fichier dépasse la taille maximale de ${TAILLE_MAX_OCTETS / 1024 / 1024} Mo.`,
    };
  }

  if (!/\.(xlsx|xlsm)$/i.test(fichier.name)) {
    return {
      erreur:
        'Format non reconnu. Enregistrez votre fichier au format Excel (.xlsx) avant de l’importer.',
    };
  }

  let grille: unknown[][];

  try {
    grille = await lireGrilleExcel(await fichier.arrayBuffer());
  } catch {
    return {
      erreur:
        "Ce fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un classeur Excel non protégé par mot de passe.",
    };
  }

  const existantes = await prisma.structure.findMany({
    where: { organisationId: acteur.organisationId, deletedAt: null },
    select: { id: true, code: true },
  });

  const codesExistants = existantes.map((structure) => structure.code);
  const rapport = analyserImportStructures(grille, codesExistants);

  const { ordonnees, cycliques } = ordonnerPourCreation(
    rapport.aCreer,
    codesExistants,
  );

  const rapportCycles = cycliques.map((structure) => ({
    ligne: structure.ligne,
    code: structure.code,
  }));

  const confirmer = donnees.get('confirmer') === '1';

  if (!confirmer) {
    return { rapport, cycliques: rapportCycles };
  }

  if (
    rapport.colonnesManquantes.length > 0 ||
    rapport.erreurs.length > 0 ||
    cycliques.length > 0
  ) {
    return {
      rapport,
      cycliques: rapportCycles,
      erreur: 'Corrigez les erreurs signalées avant de lancer l’import.',
    };
  }

  // Codes are resolved to identifiers as we go, since a parent may itself be
  // created by this very import.
  const identifiantsParCode = new Map(
    existantes.map((structure) => [structure.code.toLowerCase(), structure.id]),
  );

  let nombreCrees = 0;

  for (const structure of ordonnees) {
    const creee = await prisma.structure.create({
      data: {
        organisationId: acteur.organisationId,
        nom: structure.nom,
        sigle: structure.sigle,
        code: structure.code,
        type: structure.type as 'DIRECTION',
        description: structure.description,
        parentId:
          structure.codeParent === null
            ? null
            : (identifiantsParCode.get(structure.codeParent.toLowerCase()) ?? null),
      },
    });

    identifiantsParCode.set(structure.code.toLowerCase(), creee.id);
    nombreCrees += 1;
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'IMPORT_STRUCTURES',
      entite: 'Structure',
      apres: {
        fichier: fichier.name,
        creees: nombreCrees,
        ignorees: rapport.dejaExistants.length,
      },
    },
  });

  revalidatePath('/structures');

  return { applique: true, nombreCrees, rapport, cycliques: [] };
}
