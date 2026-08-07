'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { normaliserJour } from '@/lib/calendrier/dates';
import { envoyerEmail } from '@/lib/email/envoyer';
import { notifier, pointsFocauxDe } from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

export type EtatRetard = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  erreursChamps?: Record<string, string[]>;
};

const justificationSchema = z.object({
  statutAvancement: z.enum(['EN_COURS', 'NON_DEBUTEE']),
  justification: z
    .string()
    .trim()
    .min(10, 'Expliquez en quelques mots où en est ce travail (10 caractères au moins).')
    .max(2000, 'La justification ne peut pas dépasser 2000 caractères.'),
  prochaineDateDiffusion: z
    .string()
    .trim()
    .min(1, 'Indiquez la prochaine date de diffusion prévue.'),
});

/**
 * Records a justification and a new date, which suspends the chases (§8.2).
 *
 * The point focal keeps control of their own delay: they explain and commit to
 * a date, and the automatic chases stop until that date is itself missed.
 */
export async function justifierRetardAction(
  _etatPrecedent: EtatRetard,
  donnees: FormData,
): Promise<EtatRetard> {
  const acteur = await exigerActeur();
  const ligneId = String(donnees.get('ligneId') ?? '');

  const ligne = await prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    include: {
      calendrier: { select: { structureId: true, annee: true } },
      publication: { select: { nom: true } },
      indicateur: { select: { nom: true } },
      retard: true,
    },
  });

  if (!ligne) {
    return { erreur: "Cette ligne de calendrier n'existe plus." };
  }

  try {
    assertPermission(acteur, 'livrable:televerser', ligne.calendrier.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const analyse = justificationSchema.safeParse({
    statutAvancement: donnees.get('statutAvancement'),
    justification: donnees.get('justification'),
    prochaineDateDiffusion: donnees.get('prochaineDateDiffusion'),
  });

  if (!analyse.success) {
    return { erreursChamps: analyse.error.flatten().fieldErrors };
  }

  const prochaine = new Date(`${analyse.data.prochaineDateDiffusion}T00:00:00Z`);

  if (Number.isNaN(prochaine.getTime())) {
    return {
      erreursChamps: { prochaineDateDiffusion: ['Cette date n’est pas valide.'] },
    };
  }

  // §8.2 requires a future date: promising a date already past would suspend
  // the chases without committing to anything.
  if (prochaine <= normaliserJour(new Date())) {
    return {
      erreursChamps: {
        prochaineDateDiffusion: [
          'La prochaine date de diffusion doit être postérieure à aujourd’hui.',
        ],
      },
    };
  }

  const dejaReporte = ligne.retard?.prochaineDateDiffusion ?? null;

  // Prisma types a Json column as `InputJsonValue`, which an `unknown[]` does
  // not satisfy. The shape is ours, so we describe it rather than widen it.
  type EntreeReport = {
    ancienneDate: string;
    nouvelleDate: string;
    justification: string;
    le: string;
  };

  const historique: EntreeReport[] = Array.isArray(ligne.retard?.historiqueReports)
    ? (ligne.retard.historiqueReports as unknown as EntreeReport[])
    : [];

  await prisma.retard.upsert({
    where: { ligneCalendrierId: ligne.id },
    create: {
      ligneCalendrierId: ligne.id,
      statutAvancement: analyse.data.statutAvancement,
      justification: analyse.data.justification,
      prochaineDateDiffusion: prochaine,
      relancesSuspendues: true,
    },
    update: {
      statutAvancement: analyse.data.statutAvancement,
      justification: analyse.data.justification,
      prochaineDateDiffusion: prochaine,
      relancesSuspendues: true,
      // Each postponement is kept so an administrator can see somebody who
      // keeps pushing the date back (§8.2).
      ...(dejaReporte
        ? {
            nombreReports: { increment: 1 },
            historiqueReports: [
              ...historique,
              {
                ancienneDate: dejaReporte.toISOString().slice(0, 10),
                nouvelleDate: analyse.data.prochaineDateDiffusion,
                justification: analyse.data.justification,
                le: new Date().toISOString(),
              },
            ],
          }
        : {}),
    },
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'JUSTIFICATION_RETARD',
      entite: 'LigneCalendrier',
      entiteId: ligne.id,
      apres: {
        statutAvancement: analyse.data.statutAvancement,
        prochaineDateDiffusion: analyse.data.prochaineDateDiffusion,
        report: Boolean(dejaReporte),
      },
    },
  });

  revalidatePath('/retards');

  return {
    succes: true,
    message: dejaReporte
      ? 'Report enregistré. Les relances automatiques restent suspendues.'
      : 'Justification enregistrée. Les relances automatiques sont suspendues.',
  };
}

/** Free-text alert sent by an administrator (§8.3). */
export async function envoyerAlerteAction(
  _etatPrecedent: EtatRetard,
  donnees: FormData,
): Promise<EtatRetard> {
  const acteur = await exigerActeur();
  const ligneId = String(donnees.get('ligneId') ?? '');
  const contenu = String(donnees.get('message') ?? '').trim();

  if (contenu.length < 10) {
    return {
      erreursChamps: { message: ['Rédigez un message d’au moins 10 caractères.'] },
    };
  }

  const ligne = await prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    include: {
      calendrier: { select: { structureId: true, annee: true } },
      publication: { select: { nom: true, pointFocalId: true } },
      indicateur: { select: { nom: true, pointFocalId: true } },
    },
  });

  if (!ligne) {
    return { erreur: "Cette ligne de calendrier n'existe plus." };
  }

  try {
    assertPermission(acteur, 'alerte:envoyer', ligne.calendrier.structureId);
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  const element = ligne.publication ?? ligne.indicateur;
  const nomElement = element?.nom ?? 'Élément';

  const pointFocal = element?.pointFocalId
    ? await prisma.utilisateur.findUnique({
        where: { id: element.pointFocalId },
        select: { id: true, email: true, emailSuperieur: true },
      })
    : null;

  if (!pointFocal) {
    return { erreur: 'Aucun point focal n’est rattaché à cet élément.' };
  }

  const organisation = await prisma.organisation.findUniqueOrThrow({
    where: { id: acteur.organisationId },
    select: { nom: true, sigle: true, couleurPrimaire: true, logoUrl: true },
  });

  const sujet = `Alerte : ${nomElement} — ${ligne.libellePeriode}`;
  const corpsTexte = `${contenu}

—
Élément : ${nomElement}
Période : ${ligne.libellePeriode}
Message envoyé par ${acteur.nomComplet} pour ${organisation.nom}.`;

  // §8.3 — the supervisor is in copy, which is the point of a manual alert:
  // it escalates where an automatic chase did not work.
  await envoyerEmail({
    destinataires: [pointFocal.email],
    copie: pointFocal.emailSuperieur ? [pointFocal.emailSuperieur] : undefined,
    typeEnvoi: 'ALERTE_MANUELLE',
    ligneCalendrierId: ligne.id,
    sujet,
    corpsTexte,
    corpsHtml: `<p>${contenu.replace(/\n/g, '<br>')}</p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0">
      <p style="font-size:13px;color:#71717a">
        Élément : ${nomElement}<br>
        Période : ${ligne.libellePeriode}<br>
        Message envoyé par ${acteur.nomComplet} pour ${organisation.nom}.
      </p>`,
  });

  await notifier(
    await pointsFocauxDe(acteur.organisationId, ligne.calendrier.structureId),
    {
      type: 'ALERTE_MANUELLE',
      titre: 'Alerte de votre administrateur',
      message: contenu,
      lien: '/retards',
    },
    acteur.id,
  );

  revalidatePath('/retards');

  return { succes: true, message: 'Alerte envoyée au point focal et à son supérieur.' };
}
