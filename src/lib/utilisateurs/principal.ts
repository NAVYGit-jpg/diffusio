import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Is this account the principal super administrator — the first one, created
 * with the generated address (`SEED_SUPER_ADMIN_EMAIL`)?
 *
 * Only that account may delete other super administrators. Without the
 * variable, the oldest super administrator of the organisation holds the role.
 */
export async function estSuperAdminPrincipal(
  utilisateurId: string,
  organisationId: string,
): Promise<boolean> {
  const emailPrincipal = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  if (emailPrincipal) {
    const compte = await prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
      select: { email: true, role: true },
    });

    return compte?.role === 'SUPER_ADMIN' && compte.email.toLowerCase() === emailPrincipal;
  }

  const plusAncien = await prisma.utilisateur.findFirst({
    where: { organisationId, role: 'SUPER_ADMIN', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return plusAncien?.id === utilisateurId;
}
