import type { Role } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

/**
 * Extends the Auth.js session and token with what every permission check needs,
 * so `assertPermission` can be called without an extra database round-trip.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organisationId: string;
      role: Role;
      structureId: string | null;
      structuresAdmin: string[];
      mustChangePassword: boolean;
      nomComplet: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    organisationId: string;
    role: Role;
    structureId: string | null;
    structuresAdmin: string[];
    mustChangePassword: boolean;
    nomComplet: string;
  }
}

// The JWT interface is declared in `@auth/core/jwt`; `next-auth/jwt` only
// re-exports it. Augmenting the re-export would not merge, and every property
// would fall back to the `Record<string, unknown>` index signature.
declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    organisationId: string;
    role: Role;
    structureId: string | null;
    structuresAdmin: string[];
    mustChangePassword: boolean;
    nomComplet: string;
  }
}
