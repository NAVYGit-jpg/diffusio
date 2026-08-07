'use server';

import { revalidatePath } from 'next/cache';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { estIntouchable } from '@/lib/calendrier/comparaison';
import { normaliserJour } from '@/lib/calendrier/dates';
import { peutModifierLignes } from '@/lib/calendrier/workflow';
import { prisma } from '@/lib/prisma';

export type EtatLigne = {
  succes?: boolean;
  message?: string;
  erreur?: string;
};

/**
 * Manual edition of a generated calendar (cahier des charges §5.5).
 *
 * A generated calendar stays editable while it is not validated: a line can be
 * removed, and a release date corrected by hand. A hand-corrected line is
 * flagged so a later regeneration asks before overwriting it.
 */

async function chargerLigne(
  ligneId: string,
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
) {
  return prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    include: {
      calendrier: { select: { structureId: true, annee: true, statut: true } },
      publication: { select: { nom: true } },
      indicateur: { select: { nom: true } },
      _count: { select: { fichiers: true, valeurs: true } },
    },
  });
}

/** Shared guard: permission, workflow lock, and work already done. */
function verifierModifiable(
  acteur: Awaited<ReturnType<typeof exigerActeur>>,
  ligne: NonNullable<Awaited<ReturnType<typeof chargerLigne>>>,
): string | null {
  try {
    assertPermission(acteur, 'calendrier:generer', ligne.calendrier.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return erreur.message;
    }
    throw erreur;
  }

  if (!peutModifierLignes(ligne.calendrier.statut, acteur.role)) {
    return ligne.calendrier.statut === 'SOUMIS'
      ? 'Ce calendrier est en cours de validation : il ne peut plus être modifié.'
      : 'Ce calendrier est validé. Demandez une autorisation de modification à votre administrateur.';
  }

  if (estIntouchable(ligne.statut)) {
    return 'Cette ligne a déjà reçu son livrable ou a été mise en ligne : elle ne peut plus être modifiée.';
  }

  return null;
}

export async function modifierDateLigneAction(
  ligneId: string,
  nouvelleDate: string,
  commentaire: string,
): Promise<EtatLigne> {
  const acteur = await exigerActeur();
  const ligne = await chargerLigne(ligneId, acteur);

  if (!ligne) {
    return { erreur: "Cette ligne n'existe plus." };
  }

  const refus = verifierModifiable(acteur, ligne);

  if (refus) {
    return { erreur: refus };
  }

  const date = new Date(`${nouvelleDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return { erreur: 'Cette date n’est pas valide.' };
  }

  // A release date before the end of the period being covered would announce
  // results for a period that is not over.
  if (normaliserJour(date) < normaliserJour(ligne.dateFinCouverture)) {
    return {
      erreur:
        'La date de diffusion ne peut pas précéder la fin de la période couverte.',
    };
  }

  await prisma.ligneCalendrier.update({
    where: { id: ligneId },
    data: {
      dateDiffusionPrevue: date,
      // Flags the line so a later regeneration asks before overwriting (§5.5).
      modifieManuellement: true,
      commentaire: commentaire.trim() || null,
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MODIFICATION_LIGNE_CALENDRIER',
      entite: 'LigneCalendrier',
      entiteId: ligneId,
      avant: {
        dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString().slice(0, 10),
      },
      apres: { dateDiffusionPrevue: nouvelleDate, commentaire },
    },
  });

  revalidatePath('/calendrier');

  return { succes: true, message: 'Date modifiée.' };
}

export async function supprimerLigneAction(ligneId: string): Promise<EtatLigne> {
  const acteur = await exigerActeur();
  const ligne = await chargerLigne(ligneId, acteur);

  if (!ligne) {
    return { erreur: "Cette ligne n'existe plus." };
  }

  const refus = verifierModifiable(acteur, ligne);

  if (refus) {
    return { erreur: refus };
  }

  // Files and values are cascade-deleted by the schema. Refusing here rather
  // than silently destroying them: the person may not realise what is attached.
  if (ligne._count.fichiers > 0 || ligne._count.valeurs > 0) {
    return {
      erreur:
        'Cette ligne porte déjà des fichiers ou des valeurs. Retirez-les d’abord si vous voulez vraiment la supprimer.',
    };
  }

  const designation = `${ligne.publication?.nom ?? ligne.indicateur?.nom} — ${ligne.libellePeriode}`;

  await prisma.ligneCalendrier.delete({ where: { id: ligneId } });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'SUPPRESSION_LIGNE_CALENDRIER',
      entite: 'LigneCalendrier',
      entiteId: ligneId,
      avant: {
        designation,
        dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString().slice(0, 10),
      },
    },
  });

  revalidatePath('/calendrier');

  return { succes: true, message: `« ${designation} » supprimée.` };
}
