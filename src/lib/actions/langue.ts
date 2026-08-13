'use server';

import { revalidatePath } from 'next/cache';

import { exigerActeur } from '@/lib/auth/session';
import { langueValide } from '@/lib/langue/dictionnaire';
import { prisma } from '@/lib/prisma';

/**
 * Interface language of the signed-in user (cahier des charges §9.5).
 *
 * A personal preference, not an organisation setting: a Portuguese-speaking
 * partner and an Ivorian point focal use the same installation and must each
 * read it in their own language.
 *
 * No permission check beyond being signed in — everyone may choose their own
 * language, and the value is written to the caller's own record, never to an
 * identifier taken from the request.
 */
export async function changerLangueAction(
  langue: string,
): Promise<{ succes: boolean }> {
  const acteur = await exigerActeur();

  await prisma.utilisateur.update({
    where: { id: acteur.id },
    data: { langue: langueValide(langue) },
  });

  // The wording lives in the layout, so the whole tree has to be rebuilt.
  revalidatePath('/', 'layout');

  return { succes: true };
}
