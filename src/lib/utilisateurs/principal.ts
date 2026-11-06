import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Is this account the principal super administrator — the first one created?
 *
 * Read from the creation order, not from the address: the principal may change
 * their address at any time and must stay principal.
 */
export async function estSuperAdminPrincipal(
  utilisateurId: string,
  organisationId: string,
): Promise<boolean> {
  const premier = await prisma.utilisateur.findFirst({
    where: { organisationId, role: 'SUPER_ADMIN', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return premier?.id === utilisateurId;
}
