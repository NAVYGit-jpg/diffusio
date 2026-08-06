'use server';

import { hash, verify } from '@node-rs/argon2';
import { AuthError } from 'next-auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';

import { auth, signIn, signOut } from '@/auth';
import { identifiantsSchema, premiereConnexionSchema } from '@/lib/auth/schemas';
import { prisma } from '@/lib/prisma';
import { definirMotDePasseSchema } from '@/lib/utilisateurs/schemas';

export type EtatFormulaire = {
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
};

/** Sign-in. Never says which of the two fields was wrong (account enumeration). */
export async function connexionAction(
  _etatPrecedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const analyse = identifiantsSchema.safeParse({
    email: donnees.get('email'),
    motDePasse: donnees.get('motDePasse'),
  });

  if (!analyse.success) {
    return {
      erreursChamps: analyse.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn('credentials', {
      email: analyse.data.email,
      motDePasse: analyse.data.motDePasse,
      redirectTo: '/tableau-de-bord',
    });
  } catch (erreur) {
    // signIn signals a successful redirect by throwing: let it through.
    if (isRedirectError(erreur)) {
      throw erreur;
    }

    if (erreur instanceof AuthError) {
      return {
        erreur:
          'Adresse e-mail ou mot de passe incorrect. Après 5 tentatives, le compte est bloqué 15 minutes.',
      };
    }

    throw erreur;
  }

  return {};
}

/**
 * Forced first-login change (§2.2): e-mail, name and password all at once.
 * The session is closed afterwards so the new credentials are used from a
 * clean state.
 */
export async function premiereConnexionAction(
  _etatPrecedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  const analyse = premiereConnexionSchema.safeParse({
    nom: donnees.get('nom'),
    prenoms: donnees.get('prenoms'),
    email: donnees.get('email'),
    motDePasseActuel: donnees.get('motDePasseActuel'),
    nouveauMotDePasse: donnees.get('nouveauMotDePasse'),
    confirmation: donnees.get('confirmation'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  const donneesValidees = analyse.data;

  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: session.user.id },
  });

  if (!utilisateur) {
    redirect('/connexion');
  }

  const actuelValide = await verify(
    utilisateur.motDePasseHash,
    donneesValidees.motDePasseActuel,
  );

  if (!actuelValide) {
    return { erreursChamps: { motDePasseActuel: ['Mot de passe actuel incorrect.'] } };
  }

  // The address may already belong to somebody else in the organisation.
  if (donneesValidees.email !== utilisateur.email) {
    const dejaPris = await prisma.utilisateur.findUnique({
      where: { email: donneesValidees.email },
    });

    if (dejaPris) {
      return {
        erreursChamps: { email: ['Cette adresse e-mail est déjà utilisée.'] },
      };
    }
  }

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: {
      nom: donneesValidees.nom,
      prenoms: donneesValidees.prenoms,
      email: donneesValidees.email,
      motDePasseHash: await hash(donneesValidees.nouveauMotDePasse),
      mustChangePassword: false,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: utilisateur.organisationId,
      utilisateurId: utilisateur.id,
      action: 'PREMIERE_CONNEXION',
      entite: 'Utilisateur',
      entiteId: utilisateur.id,
      apres: {
        nom: donneesValidees.nom,
        prenoms: donneesValidees.prenoms,
        email: donneesValidees.email,
      },
    },
  });

  await signOut({ redirectTo: '/connexion?motDePasseChange=1' });

  return {};
}

export async function deconnexionAction(): Promise<void> {
  await signOut({ redirectTo: '/connexion' });
}

/**
 * Password chosen by an invited user from their e-mail link.
 *
 * The token is the only credential here, so it is single-use and time-limited:
 * it is cleared as soon as the password is set.
 */
export async function definirMotDePasseAction(
  _etatPrecedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const analyse = definirMotDePasseSchema.safeParse({
    jeton: donnees.get('jeton'),
    motDePasse: donnees.get('motDePasse'),
    confirmation: donnees.get('confirmation'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  const utilisateur = await prisma.utilisateur.findFirst({
    where: {
      jetonMotDePasse: analyse.data.jeton,
      jetonMotDePasseExpire: { gt: new Date() },
      actif: true,
      deletedAt: null,
    },
  });

  if (!utilisateur) {
    return {
      erreur:
        "Ce lien n'est plus valable. Demandez à votre administrateur de vous renvoyer une invitation.",
    };
  }

  await prisma.utilisateur.update({
    where: { id: utilisateur.id },
    data: {
      motDePasseHash: await hash(analyse.data.motDePasse),
      mustChangePassword: false,
      jetonMotDePasse: null,
      jetonMotDePasseExpire: null,
      tentativesConnexionEchouees: 0,
      bloqueJusqua: null,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: utilisateur.organisationId,
      utilisateurId: utilisateur.id,
      action: 'ACTIVATION_COMPTE',
      entite: 'Utilisateur',
      entiteId: utilisateur.id,
    },
  });

  redirect('/connexion?motDePasseChange=1');
}
