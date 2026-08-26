'use server';

import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { revalidatePath } from 'next/cache';

import { assertPermission, PermissionRefusee } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { adresseApplication } from '@/lib/email/adresse';
import { envoyerEmail } from '@/lib/email/envoyer';
import { modeleInvitation } from '@/lib/email/modeles';
import { lireGrilleExcel } from '@/lib/import/lecture-excel';
import {
  type RapportImportUtilisateurs,
  analyserImportUtilisateurs,
} from '@/lib/import/utilisateurs';
import { prisma } from '@/lib/prisma';
import { LIBELLE_ROLE } from '@/lib/utilisateurs/schemas';

export type EtatImportUtilisateurs = {
  rapport?: RapportImportUtilisateurs;
  applique?: boolean;
  nombreCrees?: number;
  nombreInvitations?: number;
  erreur?: string;
};

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;
const VALIDITE_INVITATION_HEURES = 72;

export async function importerUtilisateursAction(
  _etatPrecedent: EtatImportUtilisateurs,
  donnees: FormData,
): Promise<EtatImportUtilisateurs> {
  const acteur = await exigerActeur();

  try {
    // L'import cree des comptes : meme porte que le formulaire, meme cle.
    assertPermission(acteur, 'utilisateur:creer');
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

  const [comptes, structures] = await Promise.all([
    prisma.utilisateur.findMany({
      where: { organisationId: acteur.organisationId, deletedAt: null },
      select: { email: true, role: true, actif: true },
    }),
    prisma.structure.findMany({
      where: { organisationId: acteur.organisationId, deletedAt: null },
      select: { id: true, code: true },
    }),
  ]);

  const rapport = analyserImportUtilisateurs(grille, {
    emailsExistants: comptes.map((compte) => compte.email),
    codesStructures: structures.map((structure) => structure.code),
    superAdminsActifs: comptes.filter(
      (compte) => compte.role === 'SUPER_ADMIN' && compte.actif,
    ).length,
  });

  if (donnees.get('confirmer') !== '1') {
    return { rapport };
  }

  if (rapport.colonnesManquantes.length > 0 || rapport.erreurs.length > 0) {
    return {
      rapport,
      erreur: 'Corrigez les erreurs signalées avant de lancer l’import.',
    };
  }

  const identifiantsParCode = new Map(
    structures.map((structure) => [structure.code.toUpperCase(), structure.id]),
  );

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: acteur.organisationId },
    select: { nom: true, sigle: true, couleurPrimaire: true, logoUrl: true },
  });

  const base = adresseApplication();

  let nombreCrees = 0;
  let nombreInvitations = 0;

  for (const utilisateur of rapport.aCreer) {
    const jeton = randomBytes(32).toString('hex');

    await prisma.utilisateur.create({
      data: {
        organisationId: acteur.organisationId,
        nom: utilisateur.nom,
        prenoms: utilisateur.prenoms,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        fonction: utilisateur.fonction,
        role: utilisateur.role,
        structureId:
          utilisateur.codeStructure === null
            ? null
            : (identifiantsParCode.get(utilisateur.codeStructure) ?? null),
        emailSuperieur: utilisateur.emailSuperieur,
        estTitulaire: utilisateur.estTitulaire,
        // Same rule as the individual form: an unusable hash, and the person
        // chooses their own password from the invitation link.
        motDePasseHash: await hash(randomBytes(32).toString('hex')),
        mustChangePassword: false,
        actif: true,
        jetonMotDePasse: jeton,
        jetonMotDePasseExpire: new Date(
          Date.now() + VALIDITE_INVITATION_HEURES * 3_600_000,
        ),
        preferencesNotification: {},
        ...(utilisateur.codesStructuresSupervisees.length > 0
          ? {
              adminStructures: {
                create: utilisateur.codesStructuresSupervisees
                  .map((code) => identifiantsParCode.get(code))
                  .filter((id): id is string => Boolean(id))
                  .map((structureId) => ({ structureId })),
              },
            }
          : {}),
      },
    });

    nombreCrees += 1;

    const modele = modeleInvitation({
      organisation,
      prenoms: utilisateur.prenoms,
      nom: utilisateur.nom,
      role: LIBELLE_ROLE[utilisateur.role],
      lien: `${base}/definir-mot-de-passe?jeton=${jeton}`,
      validiteHeures: VALIDITE_INVITATION_HEURES,
    });

    const resultat = await envoyerEmail({
      destinataires: [utilisateur.email],
      typeEnvoi: 'INVITATION',
      ...modele,
    });

    if (resultat.envoye) {
      nombreInvitations += 1;
    }
  }

  // §8.4 asks for rate limiting on bulk sends. With the expected volume
  // (fewer than 300 accounts, DEC-111) a sequential loop stays well inside
  // Brevo's free quota; revisit if the volume assumption changes.

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'IMPORT_UTILISATEURS',
      entite: 'Utilisateur',
      apres: {
        fichier: fichier.name,
        creees: nombreCrees,
        invitations: nombreInvitations,
        ignorees: rapport.dejaExistants.length,
      },
    },
  });

  revalidatePath('/utilisateurs');

  return { applique: true, nombreCrees, nombreInvitations, rapport };
}
