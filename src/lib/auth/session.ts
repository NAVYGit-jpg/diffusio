import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import type { ActeurSession } from '@/lib/auth/permissions';

/**
 * Session of the current request, or a redirect to the sign-in page.
 *
 * Every server component and server action that touches data must start here:
 * the middleware protects routes, but a server action can be invoked directly
 * by a crafted request and needs its own check.
 */
export async function exigerActeur(): Promise<
  ActeurSession & { organisationId: string; nomComplet: string; email: string }
> {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  if (session.user.mustChangePassword) {
    redirect('/premiere-connexion');
  }

  return {
    id: session.user.id,
    role: session.user.role,
    structureId: session.user.structureId,
    structuresAdmin: session.user.structuresAdmin,
    organisationId: session.user.organisationId,
    nomComplet: session.user.nomComplet,
    email: session.user.email ?? '',
  };
}
