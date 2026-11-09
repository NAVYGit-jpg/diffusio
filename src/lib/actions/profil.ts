'use server';

import { hash, verify } from '@node-rs/argon2';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { motDePasseSchema } from '@/lib/auth/schemas';
import { prisma } from '@/lib/prisma';

export type EtatProfil = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
};

const coordonneesSchema = z.object({
  nom: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  prenoms: z
    .string()
    .trim()
    .min(2, 'Les prénoms doivent contenir au moins 2 caractères.'),
  telephone: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable(),
  fonction: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable(),
  emailSuperieur: z
    .string()
    .trim()
    .toLowerCase()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable()
    .refine(
      (valeur) => valeur === null || z.string().email().safeParse(valeur).success,
      "L'adresse e-mail du supérieur n'est pas valide.",
    ),
});

/**
 * Own details (cahier des charges §9.1, "Mon profil").
 *
 * The e-mail address is deliberately absent: it is the sign-in identifier, and
 * changing it silently would lock somebody out of their own account. Only an
 * administrator can change it, from the users screen.
 */
export async function enregistrerCoordonneesAction(
  _etatPrecedent: EtatProfil,
  donnees: FormData,
): Promise<EtatProfil> {
  const acteur = await exigerActeur();

  const analyse = coordonneesSchema.safeParse({
    nom: donnees.get('nom'),
    prenoms: donnees.get('prenoms'),
    telephone: donnees.get('telephone') ?? '',
    fonction: donnees.get('fonction') ?? '',
    emailSuperieur: donnees.get('emailSuperieur') ?? '',
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  // A point focal must keep a supervisor address: the manual alerts of §8.3
  // copy it in, and losing it would silence the escalation path.
  if (acteur.role === 'POINT_FOCAL' && !analyse.data.emailSuperieur) {
    return {
      erreursChamps: {
        emailSuperieur: [
          "L'adresse de votre supérieur est obligatoire. Si vous êtes votre propre supérieur, indiquez votre propre adresse.",
        ],
      },
    };
  }

  await prisma.utilisateur.update({
    where: { id: acteur.id },
    data: analyse.data,
  });

  revalidatePath('/profil');

  return { succes: true, message: 'Coordonnées mises à jour.' };
}

const changementMotDePasseSchema = z
  .object({
    motDePasseActuel: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
    nouveauMotDePasse: motDePasseSchema,
    confirmation: z.string(),
  })
  .refine((data) => data.nouveauMotDePasse === data.confirmation, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmation'],
  })
  .refine((data) => data.nouveauMotDePasse !== data.motDePasseActuel, {
    message: "Le nouveau mot de passe doit être différent de l'ancien.",
    path: ['nouveauMotDePasse'],
  });

/** Password change on demand (§9.1), not just the forced one at first login. */
export async function changerMotDePasseAction(
  _etatPrecedent: EtatProfil,
  donnees: FormData,
): Promise<EtatProfil> {
  const acteur = await exigerActeur();

  const analyse = changementMotDePasseSchema.safeParse({
    motDePasseActuel: donnees.get('motDePasseActuel'),
    nouveauMotDePasse: donnees.get('nouveauMotDePasse'),
    confirmation: donnees.get('confirmation'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  const utilisateur = await prisma.utilisateur.findUniqueOrThrow({
    where: { id: acteur.id },
    select: { motDePasseHash: true, organisationId: true },
  });

  const actuelValide = await verify(
    utilisateur.motDePasseHash,
    analyse.data.motDePasseActuel,
  );

  if (!actuelValide) {
    return {
      erreursChamps: { motDePasseActuel: ['Mot de passe actuel incorrect.'] },
    };
  }

  await prisma.utilisateur.update({
    where: { id: acteur.id },
    data: {
      motDePasseHash: await hash(analyse.data.nouveauMotDePasse),
      mustChangePassword: false,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: utilisateur.organisationId,
      utilisateurId: acteur.id,
      action: 'CHANGEMENT_MOT_DE_PASSE',
      entite: 'Utilisateur',
      entiteId: acteur.id,
    },
  });

  return { succes: true, message: 'Mot de passe modifié.' };
}

const apparenceSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable()
    .refine(
      (valeur) => valeur === null || /^https?:\/\//.test(valeur),
      "L'adresse du logo doit commencer par https://",
    ),
  couleurPrimaire: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choisissez une couleur valide.'),
  couleurSecondaire: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choisissez une couleur valide.'),
  couleurAccent: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choisissez une couleur valide.'),
  couleurFond: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Choisissez une couleur valide.'),
  couleurBouton: z
    .string()
    .trim()
    .transform((valeur) => (valeur === '' ? null : valeur))
    .nullable()
    .refine(
      (valeur) => valeur === null || /^#[0-9a-fA-F]{6}$/.test(valeur),
      'Choisissez une couleur valide.',
    ),
  slogan: z
    .string()
    .trim()
    .min(1, 'Le slogan ne peut pas être vide.')
    .max(120, 'Le slogan ne peut pas dépasser 120 caractères.'),
  police: z.string().trim().min(1),
  styleInterface: z.enum(['MODERNE', 'CLASSIQUE', 'MINIMALISTE']),
  paletteAutomatique: z.coerce.boolean(),
  densiteInterface: z.enum(['COMPACTE', 'CONFORTABLE']),
  radiusInterface: z.coerce.number().min(0).max(2),
});

/** Uploaded logo ceiling: a wordmark that heavy is a mistake, not a need. */
const LOGO_TAILLE_MAX = 1024 * 1024;

const FORMATS_LOGO = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/**
 * Organisation appearance (§9.4).
 *
 * Reserved to the super admin, and immediately visible to everybody: the values
 * are injected as CSS variables by the root layout, so nobody has to reload
 * anything for a colour change to spread.
 */
export async function enregistrerApparenceAction(
  _etatPrecedent: EtatProfil,
  donnees: FormData,
): Promise<EtatProfil> {
  const acteur = await exigerActeur();

  try {
    assertPermission(acteur, 'apparence:gerer');
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const analyse = apparenceSchema.safeParse({
    logoUrl: donnees.get('logoUrl') ?? '',
    couleurPrimaire: donnees.get('couleurPrimaire'),
    couleurSecondaire: donnees.get('couleurSecondaire'),
    couleurAccent: donnees.get('couleurAccent'),
    couleurFond: donnees.get('couleurFond'),
    couleurBouton: donnees.get('couleurBouton') ?? '',
    slogan: donnees.get('slogan'),
    police: donnees.get('police'),
    styleInterface: donnees.get('styleInterface'),
    paletteAutomatique: donnees.get('paletteAutomatique') === 'on',
    densiteInterface: donnees.get('densiteInterface'),
    radiusInterface: donnees.get('radiusInterface'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  // ---------------------------------------------------------- logo téléversé
  const fichier = donnees.get('logoFichier');
  // `Uint8Array<ArrayBuffer>` rather than the looser `Uint8Array`: Prisma 7
  // refuses a buffer that might be shared across threads.
  let logo:
    | { logoFichier: Uint8Array<ArrayBuffer>; logoMimeType: string }
    | undefined;

  if (fichier instanceof File && fichier.size > 0) {
    if (!FORMATS_LOGO.includes(fichier.type)) {
      return {
        erreursChamps: {
          logoFichier: ['Formats acceptés : PNG, JPEG, WebP ou SVG.'],
        },
      };
    }

    if (fichier.size > LOGO_TAILLE_MAX) {
      return {
        erreursChamps: {
          logoFichier: [
            `Ce fichier pèse ${Math.round(fichier.size / 1024)} Ko, au-delà de la limite de ${LOGO_TAILLE_MAX / 1024} Ko.`,
          ],
        },
      };
    }

    logo = {
      logoFichier: new Uint8Array(await fichier.arrayBuffer()),
      logoMimeType: fichier.type,
    };
  }

  // Removing the uploaded logo falls back to the DIFFUSIO wordmark rather than
  // leaving the header empty.
  const retirerLogo = donnees.get('retirerLogo') === '1';

  await prisma.organisation.update({
    where: { id: acteur.organisationId },
    data: {
      ...analyse.data,
      ...(logo ?? {}),
      ...(retirerLogo && !logo
        ? { logoFichier: null, logoMimeType: null }
        : {}),
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_APPARENCE',
      entite: 'Organisation',
      entiteId: acteur.organisationId,
      apres: analyse.data,
    },
  });

  // Every screen carries the colours, so the whole layout has to be refreshed.
  revalidatePath('/', 'layout');

  return { succes: true, message: 'Apparence mise à jour.' };
}
