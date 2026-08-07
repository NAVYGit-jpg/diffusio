'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import {
  encadrementDe,
  notifier,
  pointsFocauxDe,
} from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

export type EtatDiscussion = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
  conversationId?: string;
};

/**
 * Internal messaging (cahier des charges §9.1).
 *
 * A conversation belongs to a **structure**, not to two individuals. That is
 * what the specification describes — "messagerie avec les admins de sa
 * structure" — and it survives people moving on: a new point focal picks up the
 * thread of their predecessor instead of losing the history.
 *
 * DEC-110: point focals talk to their administrators, not to each other.
 */

const nouvelleConversationSchema = z.object({
  structureId: z.string().trim().min(1, 'Choisissez une structure.'),
  sujet: z
    .string()
    .trim()
    .min(3, 'Le sujet doit contenir au moins 3 caractères.')
    .max(200, 'Le sujet ne peut pas dépasser 200 caractères.'),
  message: z
    .string()
    .trim()
    .min(1, 'Écrivez votre message.')
    .max(5000, 'Le message ne peut pas dépasser 5000 caractères.'),
});

export async function ouvrirConversationAction(
  _etatPrecedent: EtatDiscussion,
  donnees: FormData,
): Promise<EtatDiscussion> {
  const acteur = await exigerActeur();

  const analyse = nouvelleConversationSchema.safeParse({
    structureId: donnees.get('structureId'),
    sujet: donnees.get('sujet'),
    message: donnees.get('message'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  try {
    assertPermission(acteur, 'messagerie:utiliser', analyse.data.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const conversation = await prisma.conversation.create({
    data: {
      organisationId: acteur.organisationId,
      structureId: analyse.data.structureId,
      sujet: analyse.data.sujet,
      dernierMessageAt: new Date(),
      messages: {
        create: { auteurId: acteur.id, contenu: analyse.data.message },
      },
    },
    include: { structure: { select: { nom: true } } },
  });

  await previenirLautreCamp(acteur, conversation.structureId, {
    sujet: analyse.data.sujet,
    extrait: analyse.data.message,
    conversationId: conversation.id,
    structure: conversation.structure.nom,
  });

  revalidatePath('/discussion');

  return {
    succes: true,
    message: 'Discussion ouverte.',
    conversationId: conversation.id,
  };
}

export async function repondreAction(
  _etatPrecedent: EtatDiscussion,
  donnees: FormData,
): Promise<EtatDiscussion> {
  const acteur = await exigerActeur();
  const conversationId = String(donnees.get('conversationId') ?? '');
  const contenu = String(donnees.get('message') ?? '').trim();

  if (contenu === '') {
    return { erreursChamps: { message: ['Écrivez votre message.'] } };
  }

  if (contenu.length > 5000) {
    return {
      erreursChamps: { message: ['Le message ne peut pas dépasser 5000 caractères.'] },
    };
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organisationId: acteur.organisationId },
    include: { structure: { select: { nom: true } } },
  });

  if (!conversation) {
    return { erreur: "Cette discussion n'existe plus." };
  }

  try {
    assertPermission(acteur, 'messagerie:utiliser', conversation.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, auteurId: acteur.id, contenu },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { dernierMessageAt: new Date() },
    }),
  ]);

  await previenirLautreCamp(acteur, conversation.structureId, {
    sujet: conversation.sujet,
    extrait: contenu,
    conversationId,
    structure: conversation.structure.nom,
  });

  revalidatePath('/discussion');

  return { succes: true, conversationId };
}

/**
 * Notifies the other side of the conversation.
 *
 * A point focal writing reaches their administrators; an administrator writing
 * reaches the structure's point focals. Notifying everybody every time would
 * turn the bell into noise nobody reads.
 */
async function previenirLautreCamp(
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
  structureId: string,
  contexte: {
    sujet: string;
    extrait: string;
    conversationId: string;
    structure: string;
  },
): Promise<void> {
  const destinataires =
    acteur.role === 'POINT_FOCAL'
      ? await encadrementDe(acteur.organisationId, structureId)
      : await pointsFocauxDe(acteur.organisationId, structureId);

  const apercu =
    contexte.extrait.length > 140
      ? `${contexte.extrait.slice(0, 140)}…`
      : contexte.extrait;

  await notifier(
    destinataires,
    {
      type: 'MESSAGE',
      titre: `Message — ${contexte.sujet}`,
      message: `${acteur.nomComplet} (${contexte.structure}) : ${apercu}`,
      lien: `/discussion?conversation=${contexte.conversationId}`,
    },
    acteur.id,
  );
}

/** Marks the messages of a conversation as read for the current reader. */
export async function marquerConversationLueAction(
  conversationId: string,
): Promise<void> {
  const acteur = await exigerActeur();

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organisationId: acteur.organisationId },
    select: { structureId: true },
  });

  if (!conversation) {
    return;
  }

  try {
    assertPermission(acteur, 'messagerie:utiliser', conversation.structureId);
  } catch {
    return;
  }

  // Only somebody else's messages: marking one's own as read means nothing.
  await prisma.message.updateMany({
    where: { conversationId, auteurId: { not: acteur.id }, lu: false },
    data: { lu: true },
  });

  revalidatePath('/discussion');
}
