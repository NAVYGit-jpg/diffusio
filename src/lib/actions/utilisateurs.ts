'use server';

import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { revalidatePath } from 'next/cache';

import {
  assertPermission,
  PermissionRefusee,
  peutGererCeCompte,
  peutRealiser,
  rolesAttribuables,
} from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { adresseApplication } from '@/lib/email/adresse';
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

  /**
   * Créer un compte est réservé au super administrateur.
   *
   * Un administrateur suit et corrige les points focaux de ses structures ;
   * ouvrir un accès à l'application est autre chose, et cela engage
   * l'organisation. La distinction se joue sur l'absence d'identifiant : le
   * même formulaire sert à créer et à modifier.
   */
  if (!id && !peutRealiser(acteur, 'utilisateur:creer')) {
    return {
      erreur:
        "La création d'un compte est réservée au super administrateur. Vous pouvez modifier les points focaux de vos structures.",
      valeurs: valeursSoumises(donnees),
    };
  }

  /**
   * Périmètre de gestion, vérifié ici et pas seulement à l'écran.
   *
   * L'écran d'un administrateur ne propose que le rôle « point focal » et ses
   * propres structures, mais une action serveur s'appelle directement : une
   * liste réduite dans le navigateur n'est pas une restriction. Trois refus
   * séparés, parce qu'ils ferment trois portes différentes.
   */
  if (!rolesAttribuables(acteur).includes(valeurs.role)) {
    return {
      erreur: "Vous ne pouvez pas attribuer ce rôle.",
      valeurs: valeursSoumises(donnees),
    };
  }

  // Le compte tel qu'il sera après enregistrement.
  if (
    !peutGererCeCompte(acteur, {
      role: valeurs.role,
      structureId: valeurs.structureId || null,
    })
  ) {
    return {
      erreur:
        "Vous ne gérez que les points focaux des structures que vous supervisez.",
      valeurs: valeursSoumises(donnees),
    };
  }

  // Et le compte tel qu'il est aujourd'hui : sans ce contrôle, une modification
  // permettrait de s'emparer d'un compte hors périmètre en le faisant entrer
  // dans le sien.
  if (id) {
    const existant = await prisma.utilisateur.findFirst({
      where: { id, organisationId: acteur.organisationId, deletedAt: null },
      select: { role: true, structureId: true },
    });

    if (!existant || !peutGererCeCompte(acteur, existant)) {
      return {
        erreur: "Ce compte n'est pas dans votre périmètre.",
        valeurs: valeursSoumises(donnees),
      };
    }
  }

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
        select: { nom: true, sigle: true, couleurPrimaire: true, couleurSecondaire: true, logoUrl: true, logoMimeType: true },
      }),
      valeurs.structureId
        ? prisma.structure.findUnique({
            where: { id: valeurs.structureId },
            select: { nom: true, sigle: true },
          })
        : null,
    ]);

    const base = adresseApplication();
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
    select: { id: true, actif: true, role: true, structureId: true },
  });

  if (!cible) {
    return { erreur: "Ce compte n'existe plus." };
  }

  // Désactiver un compte est aussi une modification : le périmètre vaut ici
  // comme à l'enregistrement.
  if (!peutGererCeCompte(acteur, cible)) {
    return { erreur: "Ce compte n'est pas dans votre périmètre." };
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
    select: {
      id: true,
      nom: true,
      prenoms: true,
      email: true,
      role: true,
      structureId: true,
    },
  });

  if (!cible) {
    return { erreur: "Ce compte n'existe plus." };
  }

  // Renvoyer une invitation, c'est reprendre la main sur un compte : même règle.
  if (!peutGererCeCompte(acteur, cible)) {
    return { erreur: "Ce compte n'est pas dans votre périmètre." };
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
    select: { nom: true, sigle: true, couleurPrimaire: true, couleurSecondaire: true, logoUrl: true, logoMimeType: true },
  });

  const base = adresseApplication();
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

/**
 * Deletes an account the acting super administrator created.
 *
 * Soft deletion: the person disappears from every list and can no longer sign
 * in, but the history (audit trail, discussions, publications put online)
 * keeps pointing at a real row. The address is freed so that the same person
 * can be invited again later.
 */
export async function supprimerUtilisateurAction(
  id: string,
): Promise<EtatUtilisateur> {
  const acteur = await exigerActeur();

  if (!peutRealiser(acteur, 'utilisateur:creer')) {
    return { erreur: 'Seul le super administrateur peut supprimer un compte.' };
  }

  const cible = await prisma.utilisateur.findFirst({
    where: { id, organisationId: acteur.organisationId, deletedAt: null },
    select: { id: true, email: true, nom: true, prenoms: true, role: true },
  });

  if (!cible) {
    return { erreur: "Ce compte n'existe plus." };
  }

  if (cible.id === acteur.id) {
    return { erreur: 'Vous ne pouvez pas supprimer votre propre compte.' };
  }

  if (cible.role === 'SUPER_ADMIN') {
    return { erreur: 'Un compte de super administrateur ne peut pas être supprimé.' };
  }

  // Only the accounts one created oneself. Accounts with no recorded creator
  // (imported, or created before the audit trail) stay deletable.
  const creation = await prisma.journalAudit.findFirst({
    where: { action: 'CREATION_UTILISATEUR', entiteId: cible.id },
    select: { utilisateurId: true },
  });

  if (creation?.utilisateurId && creation.utilisateurId !== acteur.id) {
    return { erreur: 'Ce compte a été ajouté par un autre administrateur.' };
  }

  // A point focal still in charge would leave reminders with no recipient.
  const [publications, indicateurs] = await Promise.all([
    prisma.publication.count({ where: { pointFocalId: cible.id, deletedAt: null } }),
    prisma.indicateur.count({ where: { pointFocalId: cible.id, deletedAt: null } }),
  ]);

  if (publications + indicateurs > 0) {
    return {
      erreur: `Impossible : cette personne est encore point focal de ${publications + indicateurs} publication(s) ou indicateur(s). Attribuez-les d’abord à quelqu’un d’autre.`,
    };
  }

  await prisma.utilisateur.update({
    where: { id: cible.id },
    data: {
      deletedAt: new Date(),
      actif: false,
      email: `supprime-${cible.id}@diffusio.invalid`,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'SUPPRESSION_UTILISATEUR',
      entite: 'Utilisateur',
      entiteId: cible.id,
      avant: { email: cible.email, nom: cible.nom, prenoms: cible.prenoms, role: cible.role },
    },
  });

  revalidatePath('/utilisateurs');

  return { succes: true, message: `Compte de ${cible.prenoms} ${cible.nom} supprimé.` };
}
