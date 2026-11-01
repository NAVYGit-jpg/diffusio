import 'server-only';

import { prisma } from '@/lib/prisma';
import { etendreAuxDescendants } from './arborescence';

/**
 * Server side of `etendreAuxDescendants`: reads the organisation's tree and
 * widens a structure filter to the children of every chosen parent.
 */
export async function avecDescendants(
  organisationId: string,
  ids: readonly string[],
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }

  const structures = await prisma.structure.findMany({
    where: { organisationId, deletedAt: null },
    select: { id: true, parentId: true },
  });

  return etendreAuxDescendants(structures, ids);
}
