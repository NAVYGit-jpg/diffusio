'use server';

import { revalidatePath } from 'next/cache';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import {
  type Transition,
  statutApres,
  transitionAutorisee,
} from '@/lib/calendrier/workflow';
import {
  encadrementDe,
  notifier,
  pointsFocauxDe,
} from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

export type EtatWorkflow = {
  succes?: boolean;
  message?: string;
  erreur?: string;
};

/**
 * Runs a workflow transition (cahier des charges §5.6).
 *
 * One entry point for every transition: the rules live in
 * `lib/calendrier/workflow.ts`, so a new transition cannot accidentally skip
 * the permission or the state check.
 */
export async function executerTransitionAction(
  calendrierId: string,
  transition: Transition,
  commentaire?: string,
): Promise<EtatWorkflow> {
  const acteur = await exigerActeur();

  const calendrier = await prisma.calendrier.findFirst({
    where: { id: calendrierId, organisationId: acteur.organisationId },
    include: {
      structure: { select: { nom: true, sigle: true } },
      _count: { select: { lignes: true } },
    },
  });

  if (!calendrier) {
    return { erreur: "Ce calendrier n'existe plus." };
  }

  // Scope first: an administrator may only act on their own structures.
  try {
    assertPermission(
      acteur,
      transition === 'valider' ||
        transition === 'renvoyerPourCorrection' ||
        transition === 'debloquer'
        ? 'calendrier:valider'
        : 'calendrier:generer',
      calendrier.structureId,
    );
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  if (!transitionAutorisee(transition, calendrier.statut, acteur.role)) {
    return {
      erreur: "Cette action n'est pas possible dans l'état actuel du calendrier.",
    };
  }

  if (transition === 'soumettre' && calendrier._count.lignes === 0) {
    return {
      erreur:
        'Ce calendrier est vide. Générez au moins une ligne avant de le soumettre.',
    };
  }

  if (transition === 'renvoyerPourCorrection' && !commentaire?.trim()) {
    return {
      erreur:
        'Indiquez ce qui doit être corrigé : le point focal doit savoir quoi reprendre.',
    };
  }

  const maintenant = new Date();
  const nouveauStatut = statutApres(transition, calendrier.statut);
  const lien = `/calendrier?structure=${calendrier.structureId}&annee=${calendrier.annee}`;
  const designation = `${calendrier.structure.nom} — ${calendrier.annee}`;

  switch (transition) {
    case 'soumettre': {
      await prisma.calendrier.update({
        where: { id: calendrierId },
        data: { statut: nouveauStatut, commentaireValidation: null },
      });

      await notifier(
        await encadrementDe(acteur.organisationId, calendrier.structureId),
        {
          type: 'CALENDRIER_SOUMIS',
          titre: 'Calendrier à valider',
          message: `Le calendrier de diffusion ${calendrier.annee} a été créé par la structure ${calendrier.structure.nom}.`,
          lien,
        },
        acteur.id,
      );
      break;
    }

    case 'valider': {
      await prisma.calendrier.update({
        where: { id: calendrierId },
        data: {
          statut: nouveauStatut,
          validePar: acteur.id,
          valideAt: maintenant,
          commentaireValidation: commentaire?.trim() || null,
          demandeDeblocage: false,
          demandeDeblocageMotif: null,
        },
      });

      await notifier(
        await pointsFocauxDe(acteur.organisationId, calendrier.structureId),
        {
          type: 'CALENDRIER_VALIDE',
          titre: 'Calendrier validé',
          message: `Votre calendrier de diffusion ${calendrier.annee} a été validé. Il n’est plus modifiable sans autorisation.`,
          lien,
        },
        acteur.id,
      );
      break;
    }

    case 'renvoyerPourCorrection': {
      await prisma.calendrier.update({
        where: { id: calendrierId },
        data: {
          statut: nouveauStatut,
          commentaireValidation: commentaire!.trim(),
        },
      });

      await notifier(
        await pointsFocauxDe(acteur.organisationId, calendrier.structureId),
        {
          type: 'CALENDRIER_RENVOYE',
          titre: 'Calendrier à corriger',
          message: `Votre calendrier ${calendrier.annee} vous est renvoyé : ${commentaire!.trim()}`,
          lien,
        },
        acteur.id,
      );
      break;
    }

    case 'debloquer': {
      await prisma.calendrier.update({
        where: { id: calendrierId },
        data: {
          statut: nouveauStatut,
          demandeDeblocage: false,
          demandeDeblocageMotif: null,
          commentaireValidation: commentaire?.trim() || null,
        },
      });

      await notifier(
        await pointsFocauxDe(acteur.organisationId, calendrier.structureId),
        {
          type: 'CALENDRIER_DEBLOQUE',
          titre: 'Calendrier rouvert',
          message: `Votre calendrier ${calendrier.annee} a été rouvert : vous pouvez de nouveau le modifier.`,
          lien,
        },
        acteur.id,
      );
      break;
    }

    case 'demanderDeblocage': {
      if (!commentaire?.trim()) {
        return {
          erreur:
            'Expliquez pourquoi ce calendrier doit être rouvert : votre administrateur en a besoin pour décider.',
        };
      }

      await prisma.calendrier.update({
        where: { id: calendrierId },
        data: {
          demandeDeblocage: true,
          demandeDeblocageMotif: commentaire.trim(),
          demandeDeblocageAt: maintenant,
        },
      });

      await notifier(
        await encadrementDe(acteur.organisationId, calendrier.structureId),
        {
          type: 'DEMANDE_DEBLOCAGE',
          titre: 'Demande de modification',
          message: `${acteur.nomComplet} demande à rouvrir le calendrier ${calendrier.annee} de ${calendrier.structure.nom} : ${commentaire.trim()}`,
          lien,
        },
        acteur.id,
      );
      break;
    }
  }

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: `CALENDRIER_${transition.toUpperCase()}`,
      entite: 'Calendrier',
      entiteId: calendrierId,
      avant: { statut: calendrier.statut },
      apres: { statut: nouveauStatut, commentaire: commentaire?.trim() ?? null },
    },
  });

  revalidatePath('/calendrier');
  revalidatePath('/notifications');

  const messages: Record<Transition, string> = {
    soumettre: `Calendrier ${designation} soumis pour validation.`,
    valider: `Calendrier ${designation} validé.`,
    renvoyerPourCorrection: `Calendrier ${designation} renvoyé pour correction.`,
    debloquer: `Calendrier ${designation} rouvert.`,
    demanderDeblocage: 'Demande transmise à votre administrateur.',
  };

  return { succes: true, message: messages[transition] };
}

/** Marks one notification as read. */
export async function marquerLueAction(id: string): Promise<EtatWorkflow> {
  const acteur = await exigerActeur();

  // Scoped by recipient: nobody can mark somebody else's notification.
  const resultat = await prisma.notification.updateMany({
    where: { id, destinataireId: acteur.id, lu: false },
    data: { lu: true, luAt: new Date() },
  });

  revalidatePath('/notifications');

  return { succes: resultat.count > 0 };
}

export async function toutMarquerLuAction(): Promise<EtatWorkflow> {
  const acteur = await exigerActeur();

  const resultat = await prisma.notification.updateMany({
    where: { destinataireId: acteur.id, lu: false },
    data: { lu: true, luAt: new Date() },
  });

  revalidatePath('/notifications');

  return {
    succes: true,
    message: `${resultat.count} notification(s) marquée(s) comme lue(s).`,
  };
}
