'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

/**
 * Automated e-mails of the organisation, steered by the super administrator
 * from their profile: each kind can be switched on or off, and the reminder
 * days and the chase frequency are adjustable.
 *
 * Manual sends (invitations, password resets, alerts an administrator writes
 * themselves) are not concerned: somebody asked for them explicitly.
 */

const reglagesSchema = z.object({
  mailsRappelsActifs: z.boolean(),
  mailsRetardsActifs: z.boolean(),
  mailsMiseEnLigneActifs: z.boolean(),
  joursRappel: z
    .array(z.number().int().min(1).max(60))
    .min(1, 'Choisissez au moins un jour de rappel.')
    .max(5, 'Cinq jours de rappel au plus.'),
  frequenceRelanceRetardJours: z.number().int().min(1).max(30),
});

export type ReglagesMails = z.infer<typeof reglagesSchema>;

export async function enregistrerMailsAutomatiquesAction(
  reglages: ReglagesMails,
): Promise<{ succes?: boolean; erreur?: string }> {
  const acteur = await exigerActeur();

  if (acteur.role !== 'SUPER_ADMIN') {
    return { erreur: 'Seul le super administrateur règle les e-mails automatiques.' };
  }

  const analyse = reglagesSchema.safeParse(reglages);

  if (!analyse.success) {
    return { erreur: analyse.error.issues[0]?.message ?? 'Réglages invalides.' };
  }

  const donnees = {
    ...analyse.data,
    joursRappel: [...new Set(analyse.data.joursRappel)].sort((a, b) => b - a),
  };

  const avant = await prisma.organisation.update({
    where: { id: acteur.organisationId },
    data: donnees,
    select: { id: true },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_PARAMETRES',
      entite: 'Organisation',
      entiteId: avant.id,
      apres: donnees,
    },
  }).catch(() => undefined);

  revalidatePath('/profil');

  return { succes: true };
}
