import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * The middleware runs on the edge runtime, where neither Prisma nor argon2 can
 * load. Keeping the providers out of this file lets `middleware.ts` import it
 * without dragging Node-only code along; `auth.ts` adds the Credentials
 * provider on top for the Node runtime.
 */

/** Routes reachable without a session. */
const ROUTES_PUBLIQUES = ['/connexion', '/mot-de-passe-oublie', '/reinitialiser'];

/** Public calendar space (DEC-113), readable without an account. */
const PREFIXE_ESPACE_PUBLIC = '/calendrier-public';

/** Where a user who must change their password is confined. */
const ROUTE_PREMIERE_CONNEXION = '/premiere-connexion';

export const authConfig = {
  pages: {
    signIn: '/connexion',
    error: '/connexion',
  },

  // Credentials provider requires JWT sessions: there is no database session
  // strategy available for it in Auth.js v5.
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 h — une journée de travail
  },

  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const connecte = Boolean(auth?.user);

      if (
        pathname === '/' ||
        pathname.startsWith(PREFIXE_ESPACE_PUBLIC) ||
        ROUTES_PUBLIQUES.some((route) => pathname.startsWith(route))
      ) {
        return true;
      }

      if (!connecte) {
        return false;
      }

      // §2.2 : tant que le mot de passe n'est pas change, aucun autre ecran
      // n'est accessible. Le controle est ici, pas seulement dans l'interface.
      if (auth?.user.mustChangePassword) {
        return pathname.startsWith(ROUTE_PREMIERE_CONNEXION);
      }

      return true;
    },

    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? '';
        token.organisationId = user.organisationId;
        token.role = user.role;
        token.structureId = user.structureId;
        token.structuresAdmin = user.structuresAdmin;
        token.mustChangePassword = user.mustChangePassword;
        token.nomComplet = user.nomComplet;
      }

      // Allows clearing the flag right after the password change, without
      // forcing the user to sign out and back in.
      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.id;
      session.user.organisationId = token.organisationId;
      session.user.role = token.role;
      session.user.structureId = token.structureId;
      session.user.structuresAdmin = token.structuresAdmin;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.nomComplet = token.nomComplet;
      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;

export { ROUTE_PREMIERE_CONNEXION, ROUTES_PUBLIQUES, PREFIXE_ESPACE_PUBLIC };
