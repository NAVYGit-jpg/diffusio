'use server';

import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';

import { PermissionRefusee, assertPermission } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { envoyerEmail } from '@/lib/email/envoyer';
import { modeleMiseEnLigne } from '@/lib/email/modeles';
import {
  analyserListeEmails,
  validerLienPublication,
} from '@/lib/livrables/regles';
import {
  copieDeStructure,
  pointsFocauxDe,
} from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';

export type EtatMiseEnLigne = {
  succes?: boolean;
  message?: string;
  erreur?: string;
  adressesInvalides?: string[];
};

/**
 * Confirms that a publication is online (cahier des charges §7).
 *
 * Reserved to administrators: the point focal delivers, the administrator
 * states that it is actually published. That separation is the reason the step
 * exists at all.
 */
export async function mettreEnLigneAction(
  _etatPrecedent: EtatMiseEnLigne,
  donnees: FormData,
): Promise<EtatMiseEnLigne> {
  const acteur = await exigerActeur();
  const ligneId = String(donnees.get('ligneId') ?? '');

  const ligne = await prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    include: {
      calendrier: { select: { structureId: true, annee: true } },
      publication: { select: { id: true, nom: true } },
      indicateur: { select: { id: true, nom: true, unite: true } },
      valeurs: { include: { indicateur: { select: { unite: true } } } },
      retard: true,
    },
  });

  if (!ligne) {
    return { erreur: "Cette ligne de calendrier n'existe plus." };
  }

  try {
    assertPermission(
      acteur,
      'miseEnLigne:confirmer',
      ligne.calendrier.structureId,
    );
  } catch (erreur) {
    if (erreur instanceof PermissionRefusee) {
      return { erreur: erreur.message };
    }
    throw erreur;
  }

  if (ligne.statut === 'MIS_EN_LIGNE') {
    return { erreur: 'Cette publication est déjà signalée comme mise en ligne.' };
  }

  const lien = String(donnees.get('lien') ?? '').trim();
  const erreurLien = validerLienPublication(lien);

  if (erreurLien) {
    return { erreur: erreurLien };
  }

  const { valides, invalides } = analyserListeEmails(
    String(donnees.get('emails') ?? ''),
  );

  if (invalides.length > 0) {
    return {
      erreur: `Ces adresses ne sont pas valides : ${invalides.join(', ')}. Corrigez-les ou retirez-les.`,
      adressesInvalides: invalides,
    };
  }

  // §7 — the release date is stated, not assumed. A publication put online on
  // Friday and recorded on Monday must count as Friday's, otherwise the respect
  // rate punishes a delay in the paperwork rather than in the publishing.
  const dateSaisie = String(donnees.get('datePublication') ?? '').trim();
  const datePublication = dateSaisie
    ? new Date(`${dateSaisie}T12:00:00Z`)
    : new Date();

  if (Number.isNaN(datePublication.getTime())) {
    return { erreur: 'La date de publication n’est pas une date valide.' };
  }

  const finDeJournee = new Date();
  finDeJournee.setUTCHours(23, 59, 59, 999);

  if (datePublication.getTime() > finDeJournee.getTime()) {
    return {
      erreur:
        'La date de publication ne peut pas être dans le futur : elle constate une mise en ligne déjà faite.',
    };
  }

  const maintenant = datePublication;
  const elementType = ligne.elementType;
  const elementId = (ligne.publicationId ?? ligne.indicateurId)!;
  const nomElement = ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément';

  // §7 — the address list is remembered per element and comes back
  // pre-filled for the following periods.
  await prisma.listeDiffusionEmail.upsert({
    where: { elementType_elementId: { elementType, elementId } },
    create: { elementType, elementId, emails: valides, majPar: acteur.id },
    update: { emails: valides, majPar: acteur.id },
  });

  const qrCodeDataUri = await QRCode.toDataURL(lien, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: 'M',
  });

  await prisma.ligneCalendrier.update({
    where: { id: ligne.id },
    data: {
      statut: 'MIS_EN_LIGNE',
      dateDiffusionReelle: maintenant,
      lienPublication: lien,
      qrCodeUrl: qrCodeDataUri,
    },
  });

  // A line that was late is now published: the dashboards read this (§8.2).
  if (ligne.retard) {
    await prisma.retard.update({
      where: { ligneCalendrierId: ligne.id },
      data: { publie: true, datePublication: maintenant },
    });
  }

  const [organisation, pointsFocaux, copieObligatoire] = await Promise.all([
    prisma.organisation.findUniqueOrThrow({
      where: { id: acteur.organisationId },
      select: { nom: true, sigle: true, couleurPrimaire: true, logoUrl: true },
    }),
    pointsFocauxDe(acteur.organisationId, ligne.calendrier.structureId),
    // §7 — the structure's team and its administrators are always in copy; the
    // super administrator's selection is added on top.
    copieDeStructure(acteur.organisationId, ligne.calendrier.structureId),
  ]);

  const adressesPointsFocaux = await prisma.utilisateur.findMany({
    where: { id: { in: pointsFocaux } },
    select: { email: true, nom: true, prenoms: true },
  });

  const nomPointFocal = adressesPointsFocaux[0]
    ? `${adressesPointsFocaux[0].prenoms} ${adressesPointsFocaux[0].nom}`
    : 'Madame, Monsieur';

  const enCopie = [
    ...new Set(
      [...copieObligatoire, ...valides].map((email) =>
        email.trim().toLowerCase(),
      ),
    ),
  ].filter(
    (email) =>
      !adressesPointsFocaux.some(
        (compte) => compte.email.toLowerCase() === email,
      ),
  );

  const valeurPrincipale = ligne.valeurs[0];
  const valeurLisible = valeurPrincipale
    ? (valeurPrincipale.valeur?.toString() ?? valeurPrincipale.valeurTexte ?? null)
    : null;

  const modele = modeleMiseEnLigne({
    organisation,
    typeProduit: elementType === 'PUBLICATION' ? 'PUBLICATION' : 'INDICATEUR',
    nomElement,
    nomPointFocal,
    periode: ligne.libellePeriode,
    dateDebutCouverture: formaterJJMMAAAA(ligne.dateDebutCouverture),
    dateFinCouverture: formaterJJMMAAAA(ligne.dateFinCouverture),
    dateDiffusionPrevue: formaterJJMMAAAA(ligne.dateDiffusionPrevue),
    dateDiffusionReelle: formaterJJMMAAAA(maintenant),
    lien,
    qrCodeDataUri,
    valeur: valeurLisible,
    unite: valeurPrincipale?.unite ?? ligne.indicateur?.unite ?? null,
  });

  // §7 — the point focal is the main recipient, the distribution list is in
  // copy. Sending to the list alone would leave the author out of their own
  // publication announcement.
  await envoyerEmail({
    destinataires: adressesPointsFocaux.map((compte) => compte.email),
    copie: enCopie,
    typeEnvoi: 'MISE_EN_LIGNE',
    ligneCalendrierId: ligne.id,
    notification: {
      titre: `Mise en ligne : ${nomElement}`,
      message: `${ligne.libellePeriode} — publié le ${formaterJJMMAAAA(maintenant)}.`,
      lien: '/produits-charges',
      auteurId: acteur.id,
    },
    ...modele,
  });

  await prisma.journalAudit.create({
    data: {
      organisationId: acteur.organisationId,
      utilisateurId: acteur.id,
      action: 'MISE_EN_LIGNE',
      entite: 'LigneCalendrier',
      entiteId: ligne.id,
      apres: { lien, destinatairesEnCopie: valides.length },
    },
  });

  revalidatePath('/calendrier');

  return {
    succes: true,
    message:
      valides.length > 0
        ? `Mise en ligne confirmée. Message envoyé au point focal, ${valides.length} adresse(s) en copie.`
        : 'Mise en ligne confirmée. Message envoyé au point focal.',
  };
}

/**
 * Pre-fills the address list of a release (§7).
 *
 * Three sources, merged: the team of the publishing structure, the
 * organisation-wide team, and whatever was actually sent for the previous
 * period of the same element. The last one is kept because an administrator may
 * have added a one-off recipient that belongs to no team.
 */
export async function listeDiffusionExistanteAction(
  ligneId: string,
): Promise<{ emails: string[] }> {
  const acteur = await exigerActeur();

  const ligne = await prisma.ligneCalendrier.findFirst({
    where: { id: ligneId, calendrier: { organisationId: acteur.organisationId } },
    select: {
      elementType: true,
      publicationId: true,
      indicateurId: true,
      calendrier: { select: { structureId: true } },
    },
  });

  if (!ligne) {
    return { emails: [] };
  }

  const [liste, equipe] = await Promise.all([
    prisma.listeDiffusionEmail.findUnique({
      where: {
        elementType_elementId: {
          elementType: ligne.elementType,
          elementId: (ligne.publicationId ?? ligne.indicateurId)!,
        },
      },
      select: { emails: true },
    }),
    prisma.membreEquipe.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        actif: true,
        // `null` is the organisation-wide team: informed of every release.
        OR: [{ structureId: ligne.calendrier.structureId }, { structureId: null }],
      },
      select: { email: true },
    }),
  ]);

  const emails = [
    ...equipe.map((membre) => membre.email),
    ...(liste?.emails ?? []),
  ].map((email) => email.trim().toLowerCase());

  return { emails: [...new Set(emails)] };
}
