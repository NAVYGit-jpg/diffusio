'use server';

import { revalidatePath } from 'next/cache';

import { PermissionRefusee, canAccessStructure } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { membreEquipeSchema } from '@/lib/equipe/schemas';
import { lireGrilleExcel } from '@/lib/import/lecture-excel';
import {
  type RapportImportEquipe,
  analyserImportEquipe,
} from '@/lib/import/equipe';
import { prisma } from '@/lib/prisma';

/**
 * Managing the team informed of a release (cahier des charges §7, §9.3).
 *
 * A team belongs to a scope: a structure, kept by its points focaux, or the
 * whole organisation, kept by the super administrator. `porteeAutorisee`
 * resolves and checks that scope once, and every action below goes through it —
 * a forgotten check here would let somebody write into another structure's list
 * of recipients.
 */

export type EtatEquipe = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
  /** Echoed back so a rejected form does not lose what was typed. */
  valeurs?: { nom?: string; fonction?: string; email?: string };
};

export type EtatImportEquipe = {
  rapport?: RapportImportEquipe;
  applique?: boolean;
  nombreCrees?: number;
  erreur?: string;
};

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

/**
 * Resolves the scope the acteur is allowed to write into.
 *
 * `ORGANISATION` is the super administrator's own team. A point focal always
 * lands on their own structure, whatever the form claims.
 */
async function porteeAutorisee(
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
  demandee: string,
): Promise<{ structureId: string | null } | { erreur: string }> {
  if (demandee === 'ORGANISATION') {
    if (acteur.role !== 'SUPER_ADMIN') {
      return {
        erreur:
          "Seul le super administrateur tient l'équipe de l'organisation.",
      };
    }

    return { structureId: null };
  }

  if (demandee === '') {
    return { erreur: 'Choisissez l’équipe à modifier.' };
  }

  if (!canAccessStructure(acteur, demandee)) {
    return { erreur: new PermissionRefusee('structure:lire', demandee).message };
  }

  const structure = await prisma.structure.findFirst({
    where: {
      id: demandee,
      organisationId: acteur.organisationId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!structure) {
    return { erreur: "Cette structure n'existe plus." };
  }

  return { structureId: structure.id };
}

/** Same address twice in one team would send the release e-mail twice. */
async function emailDejaPris(
  organisationId: string,
  structureId: string | null,
  email: string,
  saufId?: string,
): Promise<boolean> {
  const existant = await prisma.membreEquipe.findFirst({
    where: {
      organisationId,
      structureId,
      email,
      deletedAt: null,
      ...(saufId ? { NOT: { id: saufId } } : {}),
    },
    select: { id: true },
  });

  return existant !== null;
}

export async function enregistrerMembreAction(
  _etatPrecedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const acteur = await exigerActeur();

  const membreId = String(donnees.get('membreId') ?? '');
  const valeurs = {
    nom: String(donnees.get('nom') ?? ''),
    fonction: String(donnees.get('fonction') ?? ''),
    email: String(donnees.get('email') ?? ''),
  };

  const portee = await porteeAutorisee(
    acteur,
    String(donnees.get('portee') ?? ''),
  );

  if ('erreur' in portee) {
    return { erreur: portee.erreur, valeurs };
  }

  const controle = membreEquipeSchema.safeParse(valeurs);

  if (!controle.success) {
    const erreursChamps: Record<string, string[]> = {};

    for (const probleme of controle.error.issues) {
      const champ = String(probleme.path[0] ?? '');
      erreursChamps[champ] = [...(erreursChamps[champ] ?? []), probleme.message];
    }

    return { erreur: 'Corrigez les champs signalés.', erreursChamps, valeurs };
  }

  if (
    await emailDejaPris(
      acteur.organisationId,
      portee.structureId,
      controle.data.email,
      membreId || undefined,
    )
  ) {
    return {
      erreur: `« ${controle.data.email} » figure déjà dans cette équipe.`,
      erreursChamps: { email: ['Cette adresse est déjà dans l’équipe.'] },
      valeurs,
    };
  }

  if (membreId) {
    // Scoped by structure as well as by id: an identifier guessed from another
    // team must not become an update.
    const misAJour = await prisma.membreEquipe.updateMany({
      where: {
        id: membreId,
        organisationId: acteur.organisationId,
        structureId: portee.structureId,
        deletedAt: null,
      },
      data: controle.data,
    });

    if (misAJour.count === 0) {
      return { erreur: "Ce membre n'existe plus.", valeurs };
    }
  } else {
    await prisma.membreEquipe.create({
      data: {
        organisationId: acteur.organisationId,
        structureId: portee.structureId,
        creePar: acteur.id,
        ...controle.data,
      },
    });
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: membreId ? 'MODIFICATION_MEMBRE_EQUIPE' : 'AJOUT_MEMBRE_EQUIPE',
      entite: 'MembreEquipe',
      entiteId: membreId || null,
      apres: { ...controle.data, structureId: portee.structureId },
    },
  });

  revalidatePath('/equipe');

  return {
    succes: true,
    message: membreId
      ? 'Membre modifié.'
      : `${controle.data.nom} a été ajouté à l’équipe.`,
  };
}

export async function retirerMembreAction(
  _etatPrecedent: EtatEquipe,
  donnees: FormData,
): Promise<EtatEquipe> {
  const acteur = await exigerActeur();
  const membreId = String(donnees.get('membreId') ?? '');

  const portee = await porteeAutorisee(
    acteur,
    String(donnees.get('portee') ?? ''),
  );

  if ('erreur' in portee) {
    return { erreur: portee.erreur };
  }

  // Soft delete: the audit trail must still be able to say who used to be
  // informed of a release that already went out.
  const retire = await prisma.membreEquipe.updateMany({
    where: {
      id: membreId,
      organisationId: acteur.organisationId,
      structureId: portee.structureId,
      deletedAt: null,
    },
    data: { deletedAt: new Date(), actif: false },
  });

  if (retire.count === 0) {
    return { erreur: "Ce membre n'existe plus." };
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'RETRAIT_MEMBRE_EQUIPE',
      entite: 'MembreEquipe',
      entiteId: membreId,
    },
  });

  revalidatePath('/equipe');

  return { succes: true, message: 'Membre retiré de l’équipe.' };
}

/**
 * Analyses a spreadsheet and, when `confirmer` is set, applies it.
 *
 * Two steps on purpose, as everywhere else in the application: nothing is
 * written before the person has seen what the file contains.
 */
export async function importerEquipeAction(
  _etatPrecedent: EtatImportEquipe,
  donnees: FormData,
): Promise<EtatImportEquipe> {
  const acteur = await exigerActeur();

  const portee = await porteeAutorisee(
    acteur,
    String(donnees.get('portee') ?? ''),
  );

  if ('erreur' in portee) {
    return { erreur: portee.erreur };
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
    return { erreur: 'Le fichier doit être au format Excel (.xlsx).' };
  }

  const grille = await lireGrilleExcel(await fichier.arrayBuffer());

  const existants = await prisma.membreEquipe.findMany({
    where: {
      organisationId: acteur.organisationId,
      structureId: portee.structureId,
      deletedAt: null,
    },
    select: { email: true },
  });

  const rapport = analyserImportEquipe(grille, {
    emailsExistants: existants.map((membre) => membre.email),
  });

  if (donnees.get('confirmer') !== '1') {
    return { rapport };
  }

  if (rapport.aCreer.length === 0) {
    return { rapport, applique: true, nombreCrees: 0 };
  }

  await prisma.membreEquipe.createMany({
    data: rapport.aCreer.map((membre) => ({
      organisationId: acteur.organisationId,
      structureId: portee.structureId,
      creePar: acteur.id,
      nom: membre.nom,
      fonction: membre.fonction,
      email: membre.email,
    })),
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'IMPORT_EQUIPE',
      entite: 'MembreEquipe',
      apres: {
        structureId: portee.structureId,
        crees: rapport.aCreer.length,
        ignores: rapport.dejaPresents.length,
      },
    },
  });

  revalidatePath('/equipe');

  return { rapport, applique: true, nombreCrees: rapport.aCreer.length };
}
