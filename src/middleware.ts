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
  // Everything except Next internals, static assets, the Auth.js endpoints and
  // the cron route.
  //
  // `api/cron` is deliberately outside: it is called by a scheduled job with no
  // session at all, and carries its own shared-secret check. Leaving it in
  // would redirect the scheduler to the sign-in page — the job would appear to
  // succeed while never doing anything.
  //
  // Image extensions are excluded too. A file left inside the matcher is
  // answered with the sign-in page instead of its bytes: the logo of the
  // sign-in screen itself would be redirected to that very screen. Anything
  // served from `public/` is meant to be readable without a session.
  matcher: [
    '/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif)$).*)',
  ],
};
