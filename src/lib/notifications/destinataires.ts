import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Who should be told about what happens to a structure's calendar (§5.6).
 *
 * The specification asks for "tous les admins supervisant cette structure
 * (+ les super admins)". Deactivated accounts are excluded: notifying somebody
 * who can no longer sign in only makes the list look busy.
 */
export async function encadrementDe(
  organisationId: string,
  structureId: string,
): Promise<string[]> {
  const comptes = await prisma.utilisateur.findMany({
    where: {
      organisationId,
      actif: true,
      deletedAt: null,
      OR: [
        { role: 'SUPER_ADMIN' },
        { role: 'ADMIN', adminStructures: { some: { structureId } } },
      ],
    },
    select: { id: true },
  });

  return comptes.map((compte) => compte.id);
}

/** Point focal accounts of a structure; the titular one comes first. */
export async function pointsFocauxDe(
  organisationId: string,
  structureId: string,
): Promise<string[]> {
  const comptes = await prisma.utilisateur.findMany({
    where: {
      organisationId,
      structureId,
      role: 'POINT_FOCAL',
      actif: true,
      deletedAt: null,
    },
    select: { id: true },
    orderBy: [{ estTitulaire: 'desc' }, { createdAt: 'asc' }],
  });

  return comptes.map((compte) => compte.id);
}

export type NouvelleNotification = {
  type: string;
  titre: string;
  message: string;
  lien?: string;
};

/**
 * Creates one notification per recipient.
 *
 * `auteurId` is skipped: being told about one's own action is noise. Failures
 * are swallowed — a notification must never roll back the business operation
 * that triggered it.
 */
export async function notifier(
  destinataires: readonly string[],
  notification: NouvelleNotification,
  auteurId?: string,
): Promise<number> {
  const cibles = [...new Set(destinataires)].filter((id) => id !== auteurId);

  if (cibles.length === 0) {
    return 0;
  }

  try {
    const resultat = await prisma.notification.createMany({
      data: cibles.map((destinataireId) => ({
        destinataireId,
        type: notification.type,
        titre: notification.titre,
        message: notification.message,
        lien: notification.lien ?? null,
      })),
    });

    return resultat.count;
  } catch {
    return 0;
  }
}
