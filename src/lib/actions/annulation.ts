'use server';

import { revalidatePath } from 'next/cache';

import { canAccessStructure } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { encadrementDe, notifier } from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

/**
 * Cancelling a calendar line.
 *
 * The point focal asks, with a reason; an administrator (the structure's
 * supervisor) or the super administrator decides. A cancelled line leaves the
 * calendar and only shows under « État du calendrier ». A line already put
 * online cannot be cancelled: it has been released.
 */

export type EtatAnnulation = { succes?: boolean; message?: string; erreur?: string };

async function chargerLigne(ligneId: string, organisationId: string) {
  return prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId } },
    select: {
      id: true,
      statut: true,
      libellePeriode: true,
      annulationDemandee: true,
      annulationDemandeePar: true,
      calendrier: { select: { structureId: true } },
      publication: { select: { nom: true } },
      indicateur: { select: { nom: true } },
    },
  });
}

function rafraichir() {
  revalidatePath('/calendrier');
  revalidatePath('/etat-calendrier');
  revalidatePath('/tableau-de-bord');
}

export async function demanderAnnulationAction(
  ligneId: string,
  motif: string,
): Promise<EtatAnnulation> {
  const acteur = await exigerActeur();
  const raison = motif.trim();

  if (raison.length < 5) {
    return { erreur: 'Expliquez en quelques mots pourquoi la publication doit être annulée.' };
  }

  const ligne = await chargerLigne(ligneId, acteur.organisationId);

  if (!ligne || !canAccessStructure(acteur, ligne.calendrier.structureId)) {
    return { erreur: "Cette ligne n'existe plus ou n'est pas dans votre périmètre." };
  }

  if (ligne.statut === 'MIS_EN_LIGNE' || ligne.statut === 'ANNULE') {
    return { erreur: 'Cette ligne est déjà publiée ou annulée.' };
  }

  const nom = ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément';

  await prisma.ligneCalendrier.update({
    where: { id: ligne.id },
    data: {
      annulationDemandee: true,
      motifAnnulation: raison,
      annulationDemandeeAt: new Date(),
      annulationDemandeePar: acteur.id,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'DEMANDE_ANNULATION_LIGNE',
      entite: 'LigneCalendrier',
      entiteId: ligne.id,
      apres: { motif: raison },
    },
  });

  await notifier(
    await encadrementDe(acteur.organisationId, ligne.calendrier.structureId),
    {
      type: 'DEMANDE_ANNULATION',
      titre: `Demande d’annulation : ${nom}`,
      message: `${ligne.libellePeriode} — ${raison}`,
      lien: '/etat-calendrier?onglet=annulees',
    },
    acteur.id,
  );

  rafraichir();

  return { succes: true, message: 'Demande envoyée à vos administrateurs.' };
}

/**
 * Decision of an administrator: cancel the line, or turn the request down.
 * An administrator can also cancel without a prior request.
 */
export async function deciderAnnulationAction(
  ligneId: string,
  accepter: boolean,
  motif?: string,
): Promise<EtatAnnulation> {
  const acteur = await exigerActeur();

  if (acteur.role !== 'ADMIN' && acteur.role !== 'SUPER_ADMIN') {
    return { erreur: 'Seul un administrateur peut annuler une publication.' };
  }

  const ligne = await chargerLigne(ligneId, acteur.organisationId);

  if (!ligne || !canAccessStructure(acteur, ligne.calendrier.structureId)) {
    return { erreur: "Cette ligne n'existe plus ou n'est pas dans votre périmètre." };
  }

  if (ligne.statut === 'MIS_EN_LIGNE') {
    return { erreur: 'Une publication déjà en ligne ne peut pas être annulée.' };
  }

  const nom = ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément';

  await prisma.ligneCalendrier.update({
    where: { id: ligne.id },
    data: accepter
      ? {
          statut: 'ANNULE',
          annuleeAt: new Date(),
          annulationDemandee: false,
          ...(motif?.trim() ? { motifAnnulation: motif.trim() } : {}),
        }
      : { annulationDemandee: false, annulationDemandeeAt: null },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: accepter ? 'ANNULATION_LIGNE' : 'REFUS_ANNULATION_LIGNE',
      entite: 'LigneCalendrier',
      entiteId: ligne.id,
      avant: { statut: ligne.statut },
    },
  });

  if (ligne.annulationDemandeePar) {
    await notifier(
      [ligne.annulationDemandeePar],
      {
        type: accepter ? 'ANNULATION_ACCEPTEE' : 'ANNULATION_REFUSEE',
        titre: accepter ? `Annulation acceptée : ${nom}` : `Annulation refusée : ${nom}`,
        message: accepter
          ? `${ligne.libellePeriode} a été retiré du calendrier.`
          : `${ligne.libellePeriode} reste au calendrier.`,
        lien: accepter ? '/etat-calendrier?onglet=annulees' : '/calendrier',
      },
      acteur.id,
    );
  }

  rafraichir();

  return { succes: true, message: accepter ? 'Publication annulée.' : 'Demande refusée.' };
}
