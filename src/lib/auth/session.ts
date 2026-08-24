import { cache } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import type { ActeurSession } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';

/**
 * Session of the current request, or a redirect to the sign-in page.
 *
 * Every server component and server action that touches data must start here:
 * the middleware protects routes, but a server action can be invoked directly
 * by a crafted request and needs its own check.
 *
 * **Role and perimeter are re-read from the database, not taken from the
 * token.** They are written into the token when the session opens and never
 * refreshed, so an administrator who signed in before being given their
 * structures carried an empty perimeter for the whole eight hours: the screen
 * offered them « Publier le produit », and the server refused it. The same
 * staleness worked the other way round — a revoked administrator kept their
 * rights until their token expired.
 *
 * The read is memoised for the request, so a page calling this after its layout
 * already did costs nothing more.
 */
export const exigerActeur = cache(async function exigerActeur(): Promise<
  ActeurSession & { organisationId: string; nomComplet: string; email: string }
> {
  const session = await auth();

  if (!session?.user) {
    redirect('/connexion');
  }

  if (session.user.mustChangePassword) {
    redirect('/premiere-connexion');
  }

  const compte = await prisma.utilisateur.findFirst({
    where: { id: session.user.id, actif: true, deletedAt: null },
    select: {
      role: true,
      structureId: true,
      organisationId: true,
      nom: true,
      prenoms: true,
      email: true,
      adminStructures: { select: { structureId: true } },
    },
  });

  // Désactivé ou supprimé pendant que sa session courait : le jeton reste
  // valide, le compte non.
  if (!compte) {
    redirect('/connexion');
  }

  return {
    id: session.user.id,
    role: compte.role,
    structureId: compte.structureId,
    structuresAdmin: compte.adminStructures.map((lien) => lien.structureId),
    organisationId: compte.organisationId,
    nomComplet: `${compte.prenoms} ${compte.nom}`,
    email: compte.email,
  };
});
