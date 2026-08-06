'use server';

import { revalidatePath } from 'next/cache';

import { assertPermission, PermissionRefusee } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { creeraitUnCycle } from '@/lib/structures/arborescence';
import { structureSchema } from '@/lib/structures/schemas';

export type EtatStructure = {
  succes?: boolean;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
  /**
   * Values as submitted, echoed back on failure.
   *
   * React 19 resets an uncontrolled form once its action resolves; without
   * this, a validation error would empty every field the user typed.
   */
  valeurs?: Record<string, string>;
};

/** Snapshot of the form, used to repopulate the fields after an error. */
function valeursSoumises(donnees: FormData): Record<string, string> {
  return {
    nom: String(donnees.get('nom') ?? ''),
    sigle: String(donnees.get('sigle') ?? ''),
    code: String(donnees.get('code') ?? ''),
    type: String(donnees.get('type') ?? 'DIRECTION'),
    parentId: String(donnees.get('parentId') ?? 'aucune'),
    description: String(donnees.get('description') ?? ''),
  };
}

/**
 * Reads the form and validates it. Shared by creation and update.
 *
 * Radix `Select` refuses an empty string as an item value, so "no parent" is
 * carried by the sentinel `aucune` and translated back here.
 */
function analyser(donnees: FormData) {
  const parentBrut = (donnees.get('parentId') as string | null) ?? '';

  return structureSchema.safeParse({
    nom: donnees.get('nom'),
    sigle: donnees.get('sigle'),
    code: donnees.get('code'),
    type: donnees.get('type'),
    parentId: parentBrut === 'aucune' ? '' : parentBrut,
    description: donnees.get('description') ?? '',
  });
}

export async function enregistrerStructureAction(
  _etatPrecedent: EtatStructure,
  donnees: FormData,
): Promise<EtatStructure> {
  const acteur = await exigerActeur();

  try {
    // Server-side check: the sidebar hides the link, which is not a control.
    assertPermission(acteur, 'structure:gerer');
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const analyse = analyser(donnees);

  if (!analyse.success) {
    return {
      erreursChamps: analyse.error.flatten().fieldErrors,
      valeurs: valeursSoumises(donnees),
    };
  }

  const valeurs = analyse.data;
  const id = (donnees.get('id') as string | null) || null;

  const codeExistant = await prisma.structure.findFirst({
    where: {
      organisationId: acteur.organisationId,
      code: valeurs.code,
      deletedAt: null,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });

  if (codeExistant) {
    return {
      erreursChamps: { code: ['Ce code est déjà utilisé par une autre structure.'] },
      valeurs: valeursSoumises(donnees),
    };
  }

  if (valeurs.parentId !== null) {
    const parent = await prisma.structure.findFirst({
      where: {
        id: valeurs.parentId,
        organisationId: acteur.organisationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!parent) {
      return {
      erreursChamps: { parentId: ["La structure parente n'existe pas."] },
      valeurs: valeursSoumises(donnees),
    };
    }
  }

  if (id !== null && valeurs.parentId !== null) {
    const toutes = await prisma.structure.findMany({
      where: { organisationId: acteur.organisationId, deletedAt: null },
      select: { id: true, nom: true, sigle: true, code: true, parentId: true, actif: true },
    });

    if (creeraitUnCycle(toutes, id, valeurs.parentId)) {
      return {
        erreursChamps: {
          parentId: [
            'Impossible : cette structure deviendrait sa propre sous-structure.',
          ],
        },
        valeurs: valeursSoumises(donnees),
      };
    }
  }

  const donneesCommunes = {
    nom: valeurs.nom,
    sigle: valeurs.sigle,
    code: valeurs.code,
    type: valeurs.type,
    parentId: valeurs.parentId,
    description: valeurs.description || null,
  };

  if (id === null) {
    const creee = await prisma.structure.create({
      data: { ...donneesCommunes, organisationId: acteur.organisationId },
    });

    await prisma.journalAudit.create({
      data: {
        organisationId: acteur.organisationId,
        utilisateurId: acteur.id,
        action: 'CREATION_STRUCTURE',
        entite: 'Structure',
        entiteId: creee.id,
        apres: donneesCommunes,
      },
    });
  } else {
    const avant = await prisma.structure.findFirst({
      where: { id, organisationId: acteur.organisationId, deletedAt: null },
    });

    if (!avant) {
      return { erreur: "Cette structure n'existe plus." };
    }

    await prisma.structure.update({ where: { id }, data: donneesCommunes });

    await prisma.journalAudit.create({
      data: {
        organisationId: acteur.organisationId,
        utilisateurId: acteur.id,
        action: 'MODIFICATION_STRUCTURE',
        entite: 'Structure',
        entiteId: id,
        avant: {
          nom: avant.nom,
          sigle: avant.sigle,
          code: avant.code,
          type: avant.type,
          parentId: avant.parentId,
          description: avant.description,
        },
        apres: donneesCommunes,
      },
    });
  }

  revalidatePath('/structures');

  return { succes: true };
}

/**
 * Activation toggle. Never a hard delete: the specification asks for a logical
 * one because structures are referenced by publications and calendars.
 */
export async function basculerActivationStructureAction(
  id: string,
): Promise<EtatStructure> {
  const acteur = await exigerActeur();

  try {
    assertPermission(acteur, 'structure:gerer');
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const structure = await prisma.structure.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
    select: { id: true, actif: true },
  });

  if (!structure) {
    return { erreur: "Cette structure n'existe plus." };
  }

  await prisma.structure.update({
    where: { id },
    data: { actif: !structure.actif },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: structure.actif ? 'DESACTIVATION_STRUCTURE' : 'ACTIVATION_STRUCTURE',
      entite: 'Structure',
      entiteId: id,
      avant: { actif: structure.actif },
      apres: { actif: !structure.actif },
    },
  });

  revalidatePath('/structures');

  return { succes: true };
}
