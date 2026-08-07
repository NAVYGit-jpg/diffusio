'use server';

import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { revalidatePath } from 'next/cache';

import { assertPermission, PermissionRefusee } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { envoyerEmail } from '@/lib/email/envoyer';
import { modeleInvitation } from '@/lib/email/modeles';
import { prisma } from '@/lib/prisma';
import {
  estLeDernierSuperAdmin,
  peutAjouterSuperAdmin,
  titulaireADemettre,
  validerCoherenceRole,
} from '@/lib/utilisateurs/regles';
import { LIBELLE_ROLE, utilisateurSchema } from '@/lib/utilisateurs/schemas';

export type EtatUtilisateur = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
  /**
   * Invitation link, returned so an administrator can pass it on by hand.
   *
   * Indispensable as long as no mail provider is configured: without it a
   * created account would be unreachable, the message existing only in the
   * server console.
   */
  lienInvitation?: string;
  /**
   * Values as submitted, echoed back on failure.
   *
   * React 19 resets an uncontrolled form once its action resolves. Without
   * this, a single validation error would wipe every field the user typed.
   */
  valeurs?: Record<string, string | string[]>;
};

/** Snapshot of the form, used to repopulate the fields after an error. */
function valeursSoumises(donnees: FormData): Record<string, string | string[]> {
  return {
    nom: String(donnees.get('nom') ?? ''),
    prenoms: String(donnees.get('prenoms') ?? ''),
    email: String(donnees.get('email') ?? ''),
    telephone: String(donnees.get('telephone') ?? ''),
    fonction: String(donnees.get('fonction') ?? ''),
    role: String(donnees.get('role') ?? 'POINT_FOCAL'),
    structureId: String(donnees.get('structureId') ?? 'aucune'),
    emailSuperieur: String(donnees.get('emailSuperieur') ?? ''),
    estTitulaire: donnees.get('estTitulaire') === 'on' ? 'on' : '',
    structuresAdmin: donnees.getAll('structuresAdmin').map(String),
  };
}

/** Invitation links stay usable for three days. */
const VALIDITE_INVITATION_HEURES = 72;

function garderRole(acteur: Awaited<ReturnType<typeof exigerActeur>>) {
  assertPermission(acteur, 'pointFocal:gerer');
}

async function idsSuperAdminsActifs(organisationId: string): Promise<string[]> {
  const comptes = await prisma.utilisateur.findMany({
    where: {
      organisationId,
      role: 'SUPER_ADMIN',
      actif: true,
      deletedAt: null,
    },
    select: { id: true },
  });

  return comptes.map((compte) => compte.id);
}

export async function enregistrerUtilisateurAction(
  _etatPrecedent: EtatUtilisateur,
  donnees: FormData,
): Promise<EtatUtilisateur> {
  const acteur = await exigerActeur();

  try {
    garderRole(acteur);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const analyse = utilisateurSchema.safeParse({
    nom: donnees.get('nom'),
    prenoms: donnees.get('prenoms'),
    email: donnees.get('email'),
    telephone: donnees.get('telephone') ?? '',
    fonction: donnees.get('fonction') ?? '',
    role: donnees.get('role'),
    structureId:
      donnees.get('structureId') === 'aucune' ? '' : (donnees.get('structureId') ?? ''),
    emailSuperieur: donnees.get('emailSuperieur') ?? '',
    estTitulaire: donnees.get('estTitulaire') === 'on',
    structuresAdmin: donnees.getAll('structuresAdmin') as string[],
  });

  if (!analyse.success) {
    return {
      erreursChamps: analyse.error.flatten().fieldErrors,
      valeurs: valeursSoumises(donnees),
    };
  }

  const valeurs = analyse.data;
  const id = (donnees.get('id') as string | null) || null;

  // §4.3 business rules, before touching the database.
  const erreursRegles = validerCoherenceRole({
    role: valeurs.role,
    structureId: valeurs.structureId,
    emailSuperieur: valeurs.emailSuperieur,
    structuresAdmin: valeurs.structuresAdmin,
    estTitulaire: valeurs.estTitulaire,
  });

  if (erreursRegles.length > 0) {
    const erreursChamps: Record<string, string[]> = {};

    for (const erreur of erreursRegles) {
      erreursChamps[erreur.champ] = [
        ...(erreursChamps[erreur.champ] ?? []),
        erreur.message,
      ];
    }

    return { erreursChamps, valeurs: valeursSoumises(donnees) };
  }

  const emailPris = await prisma.utilisateur.findFirst({
    where: { email: valeurs.email, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });

  if (emailPris) {
    return {
      erreursChamps: { email: ['Cette adresse e-mail est déjà utilisée.'] },
      valeurs: valeursSoumises(donnees),
    };
  }

  if (valeurs.role === 'SUPER_ADMIN') {
    const actifs = await idsSuperAdminsActifs(acteur.organisationId);

    if (!peutAjouterSuperAdmin(actifs, id)) {
      return {
        erreur:
          'Le nombre maximal de 5 super administrateurs est atteint. Désactivez-en un avant d’en créer un nouveau.',
        valeurs: valeursSoumises(donnees),
      };
    }
  }

  // DEC-107: a structure has a single titular point focal.
  let aDemettre: string | null = null;

  if (valeurs.role === 'POINT_FOCAL' && valeurs.structureId) {
    const equipe = await prisma.utilisateur.findMany({
      where: {
        structureId: valeurs.structureId,
        role: 'POINT_FOCAL',
        deletedAt: null,
      },
      select: { id: true, estTitulaire: true },
    });

    aDemettre = titulaireADemettre(equipe, id, valeurs.estTitulaire);
  }

  const champsCommuns = {
    nom: valeurs.nom,
    prenoms: valeurs.prenoms,
    email: valeurs.email,
    telephone: valeurs.telephone,
    fonction: valeurs.fonction,
    role: valeurs.role,
    structureId: valeurs.structureId,
    emailSuperieur: valeurs.emailSuperieur,
    estTitulaire: valeurs.estTitulaire,
  };

  if (id === null) {
    // The account is created with an unusable password: the invited person
    // sets their own through the token link. No password ever travels by
    // e-mail.
    const jeton = randomBytes(32).toString('hex');
    const motDePasseInutilisable = randomBytes(32).toString('hex');

    const cree = await prisma.utilisateur.create({
      data: {
        ...champsCommuns,
        organisationId: acteur.organisationId,
        motDePasseHash: await hash(motDePasseInutilisable),
        mustChangePassword: false,
        actif: true,
        jetonMotDePasse: jeton,
        jetonMotDePasseExpire: new Date(
          Date.now() + VALIDITE_INVITATION_HEURES * 3_600_000,
        ),
        preferencesNotification: {},
        ...(valeurs.structuresAdmin.length > 0
          ? {
              adminStructures: {
                create: valeurs.structuresAdmin.map((structureId) => ({
                  structureId,
                })),
              },
            }
          : {}),
      },
    });

    if (aDemettre) {
      await prisma.utilisateur.update({
        where: { id: aDemettre },
        data: { estTitulaire: false },
      });
    }

    const [organisation, structure] = await Promise.all([
      prisma.organisation.findUniqueOrThrow({
        where: { id: acteur.organisationId },
        select: { nom: true, sigle: true, couleurPrimaire: true, logoUrl: true },
      }),
      valeurs.structureId
        ? prisma.structure.findUnique({
            where: { id: valeurs.structureId },
            select: { nom: true, sigle: true },
          })
        : null,
    ]);

    const base = process.env.AUTH_URL ?? 'http://localhost:3000';
    const lien = `${base}/definir-mot-de-passe?jeton=${jeton}`;
    const modele = modeleInvitation({
      organisation,
      prenoms: valeurs.prenoms,
      nom: valeurs.nom,
      role: LIBELLE_ROLE[valeurs.role],
      structure: structure ? `${structure.nom} (${structure.sigle})` : null,
      lien,
      validiteHeures: VALIDITE_INVITATION_HEURES,
    });

    await envoyerEmail({
      destinataires: [valeurs.email],
      typeEnvoi: 'INVITATION',
      ...modele,
    });

    await prisma.journalAudit.create({
      data: {
        organisationId: acteur.organisationId,
        utilisateurId: acteur.id,
        action: 'CREATION_UTILISATEUR',
        entite: 'Utilisateur',
        entiteId: cree.id,
        apres: { ...champsCommuns, structuresAdmin: valeurs.structuresAdmin },
      },
    });

    revalidatePath('/utilisateurs');

    return {
      succes: true,
      message: `Compte créé pour ${valeurs.email}.`,
      lienInvitation: lien,
    };
  }

  const avant = await prisma.utilisateur.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
    include: { adminStructures: { select: { structureId: true } } },
  });

  if (!avant) {
    return {
      erreur: "Ce compte n'existe plus.",
      valeurs: valeursSoumises(donnees),
    };
  }

  await prisma.$transaction([
    prisma.adminStructure.deleteMany({ where: { adminId: id } }),
    prisma.utilisateur.update({
      where: { id },
      data: {
        ...champsCommuns,
        ...(valeurs.structuresAdmin.length > 0
          ? {
              adminStructures: {
                create: valeurs.structuresAdmin.map((structureId) => ({
                  structureId,
                })),
              },
            }
          : {}),
      },
    }),
    ...(aDemettre
      ? [
          prisma.utilisateur.update({
            where: { id: aDemettre },
            data: { estTitulaire: false },
          }),
        ]
      : []),
  ]);

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_UTILISATEUR',
      entite: 'Utilisateur',
      entiteId: id,
      avant: {
        nom: avant.nom,
        prenoms: avant.prenoms,
        email: avant.email,
        role: avant.role,
        structureId: avant.structureId,
        estTitulaire: avant.estTitulaire,
        structuresAdmin: avant.adminStructures.map((lien) => lien.structureId),
      },
      apres: { ...champsCommuns, structuresAdmin: valeurs.structuresAdmin },
    },
  });

  revalidatePath('/utilisateurs');

  return { succes: true, message: 'Compte mis à jour.' };
}

export async function basculerActivationUtilisateurAction(
  id: string,
): Promise<EtatUtilisateur> {
  const acteur = await exigerActeur();

  try {
    garderRole(acteur);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const cible = await prisma.utilisateur.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
    select: { id: true, actif: true, role: true },
  });

  if (!cible) {
    return { erreur: "Ce compte n'existe plus." };
  }

  if (cible.id === acteur.id && cible.actif) {
    return { erreur: 'Vous ne pouvez pas désactiver votre propre compte.' };
  }

  if (cible.role === 'SUPER_ADMIN' && cible.actif) {
    const actifs = await idsSuperAdminsActifs(acteur.organisationId);

    if (estLeDernierSuperAdmin(actifs, cible.id)) {
      return {
        erreur:
          'Impossible : ce compte est le dernier super administrateur actif. Plus personne ne pourrait administrer l’application.',
      };
    }
  }

  await prisma.utilisateur.update({
    where: { id },
    data: {
      actif: !cible.actif,
      // Unblock a locked-out account when it is reactivated.
      ...(cible.actif ? {} : { tentativesConnexionEchouees: 0, bloqueJusqua: null }),
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: cible.actif ? 'DESACTIVATION_UTILISATEUR' : 'ACTIVATION_UTILISATEUR',
      entite: 'Utilisateur',
      entiteId: id,
      avant: { actif: cible.actif },
      apres: { actif: !cible.actif },
    },
  });

  revalidatePath('/utilisateurs');

  return {
    succes: true,
    message: cible.actif ? 'Compte désactivé.' : 'Compte réactivé.',
  };
}

/** Re-issues an invitation link, for instance when the first one expired. */
export async function renvoyerInvitationAction(
  id: string,
): Promise<EtatUtilisateur> {
  const acteur = await exigerActeur();

  try {
    garderRole(acteur);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const cible = await prisma.utilisateur.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
    select: { id: true, nom: true, prenoms: true, email: true, role: true },
  });

  if (!cible) {
    return { erreur: "Ce compte n'existe plus." };
  }

  const jeton = randomBytes(32).toString('hex');

  await prisma.utilisateur.update({
    where: { id },
    data: {
      jetonMotDePasse: jeton,
      jetonMotDePasseExpire: new Date(
        Date.now() + VALIDITE_INVITATION_HEURES * 3_600_000,
      ),
    },
  });

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: acteur.organisationId },
    select: { nom: true, sigle: true, couleurPrimaire: true, logoUrl: true },
  });

  const base = process.env.AUTH_URL ?? 'http://localhost:3000';
  const lien = `${base}/definir-mot-de-passe?jeton=${jeton}`;
  const modele = modeleInvitation({
    organisation,
    prenoms: cible.prenoms,
    nom: cible.nom,
    role: LIBELLE_ROLE[cible.role],
    lien,
    validiteHeures: VALIDITE_INVITATION_HEURES,
  });

  await envoyerEmail({
    destinataires: [cible.email],
    typeEnvoi: 'INVITATION',
    ...modele,
  });

  return {
    succes: true,
    message: `Invitation régénérée pour ${cible.email}.`,
    lienInvitation: lien,
  };
}
