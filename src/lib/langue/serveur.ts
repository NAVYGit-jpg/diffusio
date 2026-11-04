import 'server-only';

import { cache } from 'react';

import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { langueValide, traducteur } from './dictionnaire';

/**
 * Translator in the language of the signed-in user, for server components.
 * Cached per request: every page title and tab of a screen reads it once.
 */
export const traducteurActeur = cache(async () => {
  const acteur = await exigerActeur();
  const compte = await prisma.utilisateur.findUnique({
    where: { id: acteur.id },
    select: { langue: true },
  });

  return traducteur(langueValide(compte?.langue));
});
