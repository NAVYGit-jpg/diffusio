import { verify } from '@node-rs/argon2';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from '@/auth.config';
import { identifiantsSchema } from '@/lib/auth/schemas';
import { prisma } from '@/lib/prisma';

/**
 * Node-runtime Auth.js instance: adds the Credentials provider to the edge-safe
 * configuration. Never import this from `middleware.ts`.
 */

/** §9 Phase 9 — brute-force protection. */
const TENTATIVES_AVANT_BLOCAGE = 5;
const DUREE_BLOCAGE_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: 'Adresse e-mail', type: 'email' },
        motDePasse: { label: 'Mot de passe', type: 'password' },
      },

      async authorize(credentials) {
        const analyse = identifiantsSchema.safeParse(credentials);

        if (!analyse.success) {
          return null;
        }

        const { email, motDePasse } = analyse.data;

        const utilisateur = await prisma.utilisateur.findUnique({
          where: { email: email.toLowerCase() },
          include: { adminStructures: { select: { structureId: true } } },
        });

        // Same null answer for "unknown account", "deactivated" and "wrong
        // password": revealing which one would let an attacker enumerate
        // valid addresses.
        if (!utilisateur || !utilisateur.actif || utilisateur.deletedAt) {
          return null;
        }

        if (utilisateur.bloqueJusqua && utilisateur.bloqueJusqua > new Date()) {
          return null;
        }

        const motDePasseValide = await verify(
          utilisateur.motDePasseHash,
          motDePasse,
        );

        if (!motDePasseValide) {
          const tentatives = utilisateur.tentativesConnexionEchouees + 1;

          await prisma.utilisateur.update({
            where: { id: utilisateur.id },
            data: {
              tentativesConnexionEchouees: tentatives,
              bloqueJusqua:
                tentatives >= TENTATIVES_AVANT_BLOCAGE
                  ? new Date(Date.now() + DUREE_BLOCAGE_MINUTES * 60_000)
                  : null,
            },
          });

          return null;
        }

        await prisma.utilisateur.update({
          where: { id: utilisateur.id },
          data: {
            tentativesConnexionEchouees: 0,
            bloqueJusqua: null,
            derniereConnexion: new Date(),
          },
        });

        return {
          id: utilisateur.id,
          email: utilisateur.email,
          organisationId: utilisateur.organisationId,
          role: utilisateur.role,
          structureId: utilisateur.structureId,
          structuresAdmin: utilisateur.adminStructures.map(
            (lien) => lien.structureId,
          ),
          mustChangePassword: utilisateur.mustChangePassword,
          nomComplet: `${utilisateur.prenoms} ${utilisateur.nom}`.trim(),
        };
      },
    }),
  ],
});

/**
 * Session of the current request, shaped for the permission helpers.
 * Returns `null` when nobody is signed in.
 */
export async function acteurCourant() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    structureId: session.user.structureId,
    structuresAdmin: session.user.structuresAdmin,
  };
}
