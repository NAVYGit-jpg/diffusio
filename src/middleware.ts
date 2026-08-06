import NextAuth from 'next-auth';

import { authConfig } from '@/auth.config';

/**
 * Route protection.
 *
 * Built from the edge-safe configuration only: the middleware runs on the edge
 * runtime, where Prisma and argon2 cannot load. The actual decision lives in the
 * `authorized` callback of `auth.config.ts`.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Everything except Next internals, the Auth.js endpoints and static assets.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
